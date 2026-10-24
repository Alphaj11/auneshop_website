import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import type { AddressSnapshot } from "@/db/schema";
import { computeTotals } from "./pricing";
import { findDiscount } from "./cart";
import { getSettings } from "./settings";
import { appUrl, sendEmail } from "./email";
import { formatPrice } from "./money";
import { orderAccessToken } from "./order-token";

export class CheckoutError extends Error {}

export type PaymentModeValue = "demo" | "stripe_test" | "stripe_live";

/** Mode de paiement actif, déterminé uniquement côté serveur. */
/**
 * En production, le mode démonstration est bloqué sauf autorisation explicite
 * (site de présentation) : une boutique en ligne ne doit pas accepter de commandes
 * qui ne seront jamais payées.
 */
export function demoCheckoutAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_CHECKOUT === "true";
}

export function currentPaymentMode(): PaymentModeValue {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (process.env.PAYMENT_MODE === "stripe" && key) return key.startsWith("sk_live_") ? "stripe_live" : "stripe_test";
  return "demo";
}

/**
 * Crée une commande à partir du panier, dans une transaction :
 * - vérifie la disponibilité et réserve le stock (décrément atomique) ;
 * - fige les informations commerciales (nom, variante, prix) ;
 * - recalcule les montants côté serveur (jamais ceux envoyés par le navigateur).
 */
export async function createOrderFromCart(input: {
  cartId: string;
  userId: string | null;
  email: string;
  shippingAddress: AddressSnapshot;
  customerNote?: string | null;
}) {
  const settings = await getSettings();
  const mode = currentPaymentMode();

  return db.transaction(async (tx) => {
    const cart = await tx.query.carts.findFirst({
      where: eq(schema.carts.id, input.cartId),
      with: {
        items: {
          with: { variant: { with: { product: { with: { images: true } } } } },
        },
      },
    });
    if (!cart || !cart.items.length) throw new CheckoutError("Votre panier est vide.");

    const lines: {
      variantId: string;
      productId: string;
      productName: string;
      productSlug: string;
      variantLabel: string;
      sku: string;
      size: string;
      color: string;
      imageUrl: string | null;
      unitPriceCents: number;
      quantity: number;
      track: boolean;
    }[] = [];

    for (const item of cart.items) {
      const v = item.variant;
      const p = v.product;
      if (p.status !== "active" || !v.isActive) throw new CheckoutError(`« ${p.name} » n'est plus disponible.`);
      const img =
        p.images.find((i) => i.kind === "cutout" && i.color === v.color) ??
        p.images.find((i) => i.kind === "gallery" && i.color === v.color) ??
        p.images[0];
      lines.push({
        variantId: v.id,
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        variantLabel: [v.color, v.size].filter((x) => x && x !== "Unique").join(" / ") || "Unique",
        sku: v.sku,
        size: v.size,
        color: v.color,
        imageUrl: img?.url ?? null,
        unitPriceCents: v.priceCents ?? p.priceCents,
        quantity: item.quantity,
        track: v.trackInventory,
      });
    }

    const discount = await findDiscount(cart.discountCode);
    const totals = computeTotals(lines, settings.shipping, discount, settings.store.vatRate);

    const [order] = await tx
      .insert(schema.orders)
      .values({
        userId: input.userId,
        email: input.email,
        paymentMode: mode,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        shippingCents: totals.shippingCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        discountCode: totals.discountApplied ? discount?.code : null,
        shippingMethod: settings.shipping.methodName,
        shippingAddress: input.shippingAddress,
        billingAddress: input.shippingAddress,
        customerNote: input.customerNote || null,
        isTest: mode !== "stripe_live",
        cartId: cart.id,
        stockReserved: true,
      })
      .returning();

    // Réservation du stock : échoue proprement si une autre commande vient de prendre la dernière pièce.
    for (const l of lines) {
      if (!l.track) continue;
      if (settings.inventory.preventOverselling) {
        const updated = await tx
          .update(schema.productVariants)
          .set({ stock: sql`${schema.productVariants.stock} - ${l.quantity}` })
          .where(and(eq(schema.productVariants.id, l.variantId), gte(schema.productVariants.stock, l.quantity)))
          .returning({ stock: schema.productVariants.stock });
        if (!updated[0]) throw new CheckoutError(`Stock insuffisant pour « ${l.productName} » (${l.variantLabel}).`);
        await tx.insert(schema.inventoryMovements).values({ variantId: l.variantId, delta: -l.quantity, stockAfter: updated[0].stock, reason: "order", orderId: order.id });
      } else {
        const [u] = await tx
          .update(schema.productVariants)
          .set({ stock: sql`greatest(${schema.productVariants.stock} - ${l.quantity}, 0)` })
          .where(eq(schema.productVariants.id, l.variantId))
          .returning({ stock: schema.productVariants.stock });
        await tx.insert(schema.inventoryMovements).values({ variantId: l.variantId, delta: -l.quantity, stockAfter: u.stock, reason: "order", orderId: order.id });
      }
    }

    if (discount && totals.discountApplied) {
      const used = await tx
        .update(schema.discounts)
        .set({ usedCount: sql`${schema.discounts.usedCount} + 1` })
        .where(
          and(
            eq(schema.discounts.id, discount.id),
            sql`(${schema.discounts.usageLimit} IS NULL OR ${schema.discounts.usedCount} < ${schema.discounts.usageLimit})`,
          ),
        )
        .returning();
      if (!used[0]) throw new CheckoutError("Ce code de réduction n'est plus disponible.");
    }

    await tx.insert(schema.orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        productId: l.productId,
        variantId: l.variantId,
        productName: l.productName,
        productSlug: l.productSlug,
        variantLabel: l.variantLabel,
        sku: l.sku,
        size: l.size,
        color: l.color,
        imageUrl: l.imageUrl,
        unitPriceCents: l.unitPriceCents,
        quantity: l.quantity,
        lineTotalCents: l.unitPriceCents * l.quantity,
      })),
    );
    await tx.insert(schema.orderEvents).values({
      orderId: order.id,
      type: "created",
      message: `Commande créée (${mode === "demo" ? "mode démonstration" : mode === "stripe_test" ? "Stripe test" : "Stripe"}) — en attente de paiement.`,
      isInternal: false,
    });
    return { order, lines };
  });
}

/**
 * Passe une commande à l'état payé. Appelé UNIQUEMENT après confirmation
 * fiable du prestataire (webhook Stripe signé, ou simulation démo côté serveur).
 * Idempotent : un deuxième appel ne fait rien.
 */
export async function markOrderPaid(input: {
  orderId: string;
  provider: "stripe" | "demo";
  providerRef: string;
  amountCents: number;
  paymentIntentId?: string | null;
  livemode?: boolean;
}) {
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, input.orderId)).for("update");
    if (!order) throw new Error(`Commande ${input.orderId} introuvable`);
    if (order.paymentStatus === "paid") return { order, changed: false };
    if (input.amountCents !== order.totalCents) {
      await tx.insert(schema.orderEvents).values({
        orderId: order.id,
        type: "payment",
        message: `Montant payé (${formatPrice(input.amountCents)}) différent du total (${formatPrice(order.totalCents)}) : vérification manuelle nécessaire.`,
      });
      throw new Error("Montant incohérent");
    }
    if (order.status === "cancelled") {
      // Paiement reçu après annulation (ex. session expirée) : on le signale sans réactiver automatiquement.
      await tx.insert(schema.orderEvents).values({ orderId: order.id, type: "payment", message: "Paiement reçu sur une commande annulée : à rembourser ou réactiver manuellement." });
    }
    await tx
      .insert(schema.payments)
      .values({
        orderId: order.id,
        provider: input.provider,
        providerRef: input.providerRef,
        paymentIntentId: input.paymentIntentId ?? null,
        status: "paid",
        amountCents: input.amountCents,
        livemode: !!input.livemode,
      })
      .onConflictDoUpdate({
        target: [schema.payments.provider, schema.payments.providerRef],
        set: { status: "paid", paymentIntentId: input.paymentIntentId ?? null, amountCents: input.amountCents, livemode: !!input.livemode },
      });
    const [updated] = await tx
      .update(schema.orders)
      .set({ paymentStatus: "paid", status: order.status === "pending_payment" ? "paid" : order.status, paidAt: new Date() })
      .where(eq(schema.orders.id, order.id))
      .returning();
    await tx.insert(schema.orderEvents).values({
      orderId: order.id,
      type: "payment",
      message: input.provider === "demo" ? "Paiement SIMULÉ (mode démonstration) — aucun argent n'a été encaissé." : `Paiement confirmé par Stripe (${input.paymentIntentId ?? input.providerRef}).`,
      isInternal: false,
    });
    if (order.cartId) await tx.delete(schema.cartItems).where(eq(schema.cartItems.cartId, order.cartId));
    return { order: updated, changed: true };
  });
  if (result.changed) await sendOrderConfirmation(result.order.id);
  return result;
}

/** Échec ou expiration du paiement : annule la commande et restitue le stock. */
export async function failOrderPayment(orderId: string, reason: string, status: "failed" | "cancelled" = "failed", providerRef?: string) {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!order || order.paymentStatus === "paid" || order.status === "cancelled") return;
    if (providerRef)
      await tx
        .update(schema.payments)
        .set({ status, failureMessage: reason })
        .where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.providerRef, providerRef)));
    await tx.update(schema.orders).set({ status: "cancelled", paymentStatus: status, cancelledAt: new Date() }).where(eq(schema.orders.id, orderId));
    await releaseStock(tx, order, null);
    await tx.insert(schema.orderEvents).values({ orderId, type: "payment", message: reason, isInternal: false });
  });
}

/** Restitue le stock réservé et le code promo d'une commande annulée. */
export async function releaseStock(tx: Tx, order: typeof schema.orders.$inferSelect, userId: string | null) {
  if (!order.stockReserved) return;
  const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  for (const it of items) {
    if (!it.variantId) continue;
    const [v] = await tx
      .update(schema.productVariants)
      .set({ stock: sql`${schema.productVariants.stock} + ${it.quantity}` })
      .where(and(eq(schema.productVariants.id, it.variantId), eq(schema.productVariants.trackInventory, true)))
      .returning({ stock: schema.productVariants.stock });
    if (v)
      await tx.insert(schema.inventoryMovements).values({ variantId: it.variantId, delta: it.quantity, stockAfter: v.stock, reason: "order_cancelled", orderId: order.id, userId });
  }
  if (order.discountCode)
    await tx
      .update(schema.discounts)
      .set({ usedCount: sql`greatest(${schema.discounts.usedCount} - 1, 0)` })
      .where(sql`upper(${schema.discounts.code}) = upper(${order.discountCode})`);
  await tx.update(schema.orders).set({ stockReserved: false }).where(eq(schema.orders.id, order.id));
}

export async function sendOrderConfirmation(orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { items: true } });
  if (!order) return;
  const settings = await getSettings();
  const lines = order.items.map((i) => `• ${i.productName} (${i.variantLabel}) × ${i.quantity} — ${formatPrice(i.lineTotalCents)}`).join("\n");
  await sendEmail({
    to: order.email,
    subject: `${order.isTest ? "[TEST] " : ""}Confirmation de votre commande ${order.number}`,
    text: `Bonjour ${order.shippingAddress.firstName},\n\nMerci pour votre commande ${order.number}.${order.paymentMode === "demo" ? "\n\n⚠ Commande de démonstration : aucun paiement réel n'a été effectué et elle ne sera pas expédiée." : ""}\n\n${lines}\n\nLivraison : ${order.shippingCents ? formatPrice(order.shippingCents) : "offerte"}\nTotal TTC : ${formatPrice(order.totalCents)}\n\n${settings.shipping.delayText}\n\nSuivre votre commande : ${appUrl(`/commande/confirmation/${order.id}?t=${orderAccessToken(order.id)}`)}\n\n${settings.store.name}`,
  });
}

/**
 * Annule les commandes restées en attente de paiement (stock réservé) :
 * 30 min pour le mode démo, 2 h pour Stripe (filet de sécurité si le webhook
 * d'expiration n'est pas arrivé). Appelée au passage de commande, à l'ouverture
 * du tableau de bord et par la route /api/cron/expire-orders.
 */
export async function expireStaleOrders() {
  const stale = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.status, "pending_payment"),
        sql`(${schema.orders.paymentMode} = 'demo' AND ${schema.orders.createdAt} < now() - interval '30 minutes')
          OR (${schema.orders.paymentMode} <> 'demo' AND ${schema.orders.createdAt} < now() - interval '2 hours')`,
      ),
    )
    .limit(100);
  for (const o of stale) await failOrderPayment(o.id, "Paiement non finalisé dans le délai : commande annulée, stock restitué.", "cancelled");
  return stale.length;
}
