"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { orderAccessToken, verifyOrderAccessToken } from "@/lib/order-token";
import { currentPaymentMode, demoCheckoutAllowed, failOrderPayment, markOrderPaid } from "@/lib/orders";

/**
 * Simulation de paiement — mode démonstration uniquement.
 * Refusée dès que le paiement réel (Stripe) est configuré, et uniquement
 * pour des commandes créées en mode démo (payment_mode = demo, is_test = true).
 */
export async function simulatePayment(orderId: string, token: string, outcome: "success" | "failure") {
  if (currentPaymentMode() !== "demo" || !demoCheckoutAllowed()) throw new Error("Simulation désactivée : le paiement réel est configuré.");
  if (!verifyOrderAccessToken(orderId, token)) throw new Error("Accès refusé.");
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  if (!order || order.paymentMode !== "demo" || !order.isTest) throw new Error("Commande non éligible à la simulation.");
  const ref = `demo_${order.id}`;
  if (outcome === "success") {
    await markOrderPaid({ orderId, provider: "demo", providerRef: ref, amountCents: order.totalCents });
    redirect(`/commande/confirmation/${orderId}?t=${orderAccessToken(orderId)}`);
  }
  await db.insert(schema.payments).values({ orderId, provider: "demo", providerRef: ref, status: "failed", amountCents: order.totalCents }).onConflictDoNothing();
  await failOrderPayment(orderId, "Paiement de démonstration refusé (simulation).", "failed", ref);
  redirect(`/commande/annulee/${orderId}?t=${orderAccessToken(orderId)}`);
}
