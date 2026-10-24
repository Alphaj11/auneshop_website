"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { appUrl, sendEmail } from "@/lib/email";
import { orderAccessToken } from "@/lib/order-token";
import { releaseStock } from "@/lib/orders";
import { stripe } from "@/lib/payments/stripe";
import { orderStatusLabels } from "@/lib/labels";
import { formatPrice, parsePriceToCents } from "@/lib/money";
import type { ActionResult } from "@/components/admin/ActionForm";

/** Transitions de traitement autorisées. Le statut « payé » ne s'obtient JAMAIS manuellement. */
const transitions: Record<string, string[]> = {
  paid: ["processing", "shipped"],
  processing: ["shipped", "paid"],
  shipped: ["delivered", "processing"],
  delivered: ["shipped"],
};

async function load(orderId: string) {
  if (!z.string().uuid().safeParse(orderId).success) return null;
  return db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
}

export async function updateOrderStatus(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("orders.manage");
  const order = await load(String(form.get("orderId")));
  const status = String(form.get("status"));
  if (!order) return { error: "Commande introuvable." };
  if (order.paymentStatus !== "paid" && order.paymentStatus !== "partially_refunded")
    return { error: "Impossible : le paiement de cette commande n'est pas confirmé par le prestataire." };
  if (!transitions[order.status]?.includes(status)) return { error: `Transition impossible depuis « ${orderStatusLabels[order.status]} ».` };
  await db.update(schema.orders).set({ status: status as typeof order.status }).where(eq(schema.orders.id, order.id));
  await db.insert(schema.orderEvents).values({ orderId: order.id, type: "status_change", message: `Statut : ${orderStatusLabels[order.status]} → ${orderStatusLabels[status]}`, userId: user.id, isInternal: false });
  await audit({ userId: user.id, action: "order.status", entityType: "order", entityId: order.id, data: { from: order.status, to: status } });
  revalidatePath(`/admin/commandes/${order.id}`);
  return { ok: true, message: "Statut mis à jour." };
}

export async function addShipment(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("orders.manage");
  const order = await load(String(form.get("orderId")));
  if (!order) return { error: "Commande introuvable." };
  if (order.paymentStatus !== "paid") return { error: "Le paiement doit être confirmé avant l'expédition." };
  const parsed = z
    .object({ carrier: z.string().trim().min(1).max(60), trackingNumber: z.string().trim().max(80).optional(), trackingUrl: z.string().trim().url().max(500).optional().or(z.literal("")) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Vérifiez le transporteur et le lien de suivi." };
  await db.insert(schema.shipments).values({
    orderId: order.id,
    carrier: parsed.data.carrier,
    trackingNumber: parsed.data.trackingNumber || null,
    trackingUrl: parsed.data.trackingUrl || null,
    status: "shipped",
    shippedAt: new Date(),
  });
  if (order.status === "paid" || order.status === "processing") await db.update(schema.orders).set({ status: "shipped" }).where(eq(schema.orders.id, order.id));
  await db.insert(schema.orderEvents).values({ orderId: order.id, type: "shipment", message: `Expédiée via ${parsed.data.carrier}${parsed.data.trackingNumber ? ` (suivi ${parsed.data.trackingNumber})` : ""}.`, userId: user.id, isInternal: false });
  if (form.get("notify") === "on")
    await sendEmail({
      to: order.email,
      subject: `${order.isTest ? "[TEST] " : ""}Votre commande ${order.number} est en route`,
      text: `Bonjour,\n\nVotre commande ${order.number} a été expédiée via ${parsed.data.carrier}.${parsed.data.trackingNumber ? `\nNuméro de suivi : ${parsed.data.trackingNumber}` : ""}${parsed.data.trackingUrl ? `\nSuivre le colis : ${parsed.data.trackingUrl}` : ""}\n\nDétail : ${appUrl(`/commande/confirmation/${order.id}?t=${orderAccessToken(order.id)}`)}`,
    });
  await audit({ userId: user.id, action: "order.shipment", entityType: "order", entityId: order.id, data: parsed.data });
  revalidatePath(`/admin/commandes/${order.id}`);
  return { ok: true, message: "Expédition enregistrée." };
}

export async function addOrderNote(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("orders.manage");
  const order = await load(String(form.get("orderId")));
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  if (!order || !note) return { error: "Note vide." };
  await db.insert(schema.orderEvents).values({ orderId: order.id, type: "note", message: note, userId: user.id, isInternal: true });
  revalidatePath(`/admin/commandes/${order.id}`);
  return { ok: true, message: "Note ajoutée." };
}

export async function cancelOrder(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("orders.manage");
  const order = await load(String(form.get("orderId")));
  if (!order) return { error: "Commande introuvable." };
  if (order.status === "cancelled" || order.status === "refunded") return { error: "Commande déjà annulée." };
  if (order.paymentStatus === "paid") return { error: "Commande payée : effectuez d'abord un remboursement." };
  if (order.status === "shipped" || order.status === "delivered") return { error: "Commande déjà expédiée." };
  await db.transaction(async (tx) => {
    await tx.update(schema.orders).set({ status: "cancelled", paymentStatus: "cancelled", cancelledAt: new Date() }).where(eq(schema.orders.id, order.id));
    await releaseStock(tx, order, user.id);
    await tx.insert(schema.orderEvents).values({ orderId: order.id, type: "status_change", message: `Commande annulée par l'équipe. ${String(form.get("reason") ?? "").slice(0, 300)}`, userId: user.id, isInternal: false });
  });
  await audit({ userId: user.id, action: "order.cancel", entityType: "order", entityId: order.id });
  revalidatePath(`/admin/commandes/${order.id}`);
  return { ok: true, message: "Commande annulée, stock restitué." };
}

/**
 * Remboursement.
 * - Commande Stripe : remboursement demandé à Stripe ; l'état final est confirmé par le webhook.
 * - Commande de démonstration : remboursement SIMULÉ, aucun appel externe.
 */
export async function refundOrder(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("orders.refund");
  const order = await load(String(form.get("orderId")));
  if (!order) return { error: "Commande introuvable." };
  if (order.paymentStatus !== "paid" && order.paymentStatus !== "partially_refunded") return { error: "Rien à rembourser : paiement non confirmé." };
  const payment = await db.query.payments.findFirst({ where: and(eq(schema.payments.orderId, order.id), eq(schema.payments.status, "paid")) })
    ?? (await db.query.payments.findFirst({ where: and(eq(schema.payments.orderId, order.id), eq(schema.payments.status, "partially_refunded")) }));
  if (!payment) return { error: "Paiement introuvable." };
  const remaining = payment.amountCents - payment.refundedCents;
  const raw = String(form.get("amount") ?? "").trim();
  const amount = raw ? parsePriceToCents(raw) : remaining;
  if (amount === null || amount <= 0 || amount > remaining) return { error: `Montant invalide (maximum ${formatPrice(remaining)}).` };
  const restock = form.get("restock") === "on";

  if (payment.provider === "stripe" && order.paymentMode !== "demo") {
    if (!payment.paymentIntentId) return { error: "Identifiant de paiement Stripe manquant." };
    try {
      await stripe().refunds.create({ payment_intent: payment.paymentIntentId, amount, metadata: { orderId: order.id, by: user.id } });
    } catch (e) {
      console.error("[refund]", e);
      return { error: "Stripe a refusé le remboursement. Consultez le tableau de bord Stripe." };
    }
    await db.insert(schema.orderEvents).values({ orderId: order.id, type: "refund", message: `Remboursement de ${formatPrice(amount)} demandé à Stripe (confirmation attendue par webhook).`, userId: user.id });
  } else {
    const refunded = payment.refundedCents + amount;
    const full = refunded >= payment.amountCents;
    await db.update(schema.payments).set({ refundedCents: refunded, status: full ? "refunded" : "partially_refunded" }).where(eq(schema.payments.id, payment.id));
    await db.update(schema.orders).set({ paymentStatus: full ? "refunded" : "partially_refunded", ...(full ? { status: "refunded" as const } : {}) }).where(eq(schema.orders.id, order.id));
    await db.insert(schema.orderEvents).values({ orderId: order.id, type: "refund", message: `Remboursement SIMULÉ de ${formatPrice(amount)} (commande de démonstration, aucun mouvement d'argent).`, userId: user.id, isInternal: false });
  }

  if (restock) {
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
    for (const it of items) {
      if (!it.variantId) continue;
      const [v] = await db
        .update(schema.productVariants)
        .set({ stock: sql`${schema.productVariants.stock} + ${it.quantity}` })
        .where(and(eq(schema.productVariants.id, it.variantId), eq(schema.productVariants.trackInventory, true)))
        .returning();
      if (v) await db.insert(schema.inventoryMovements).values({ variantId: v.id, delta: it.quantity, stockAfter: v.stock, reason: "return", orderId: order.id, userId: user.id });
    }
  }
  await audit({ userId: user.id, action: "order.refund", entityType: "order", entityId: order.id, data: { amount, restock, provider: payment.provider } });
  revalidatePath(`/admin/commandes/${order.id}`);
  return { ok: true, message: payment.provider === "stripe" ? "Remboursement demandé à Stripe." : "Remboursement simulé enregistré." };
}
