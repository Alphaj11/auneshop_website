import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { failOrderPayment, markOrderPaid } from "@/lib/orders";
import { stripe } from "@/lib/payments/stripe";

/**
 * Webhook Stripe : seule source de vérité pour l'état « payé ».
 * La signature est vérifiée avec STRIPE_WEBHOOK_SECRET ; chaque événement
 * n'est traité qu'une fois (table webhook_events).
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Configuration manquante" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const already = await db.query.webhookEvents.findFirst({ where: eq(schema.webhookEvents.id, event.id) });
  if (already) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (orderId && session.payment_status === "paid") {
          await markOrderPaid({
            orderId,
            provider: "stripe",
            providerRef: session.id,
            amountCents: session.amount_total ?? -1,
            paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
            livemode: session.livemode,
          });
        } else if (orderId) {
          await db.insert(schema.orderEvents).values({ orderId, type: "payment", message: "Paiement en cours de traitement chez Stripe (moyen de paiement différé)." });
        }
        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.orderId) await failOrderPayment(session.metadata.orderId, "Le paiement a échoué.", "failed", session.id);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.orderId) await failOrderPayment(session.metadata.orderId, "Session de paiement expirée : commande annulée, stock restitué.", "cancelled", session.id);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (pi) {
          const payment = await db.query.payments.findFirst({ where: eq(schema.payments.paymentIntentId, pi) });
          if (payment) {
            const full = charge.amount_refunded >= charge.amount;
            await db.update(schema.payments).set({ refundedCents: charge.amount_refunded, status: full ? "refunded" : "partially_refunded" }).where(eq(schema.payments.id, payment.id));
            await db.update(schema.orders).set({ paymentStatus: full ? "refunded" : "partially_refunded", ...(full ? { status: "refunded" as const } : {}) }).where(eq(schema.orders.id, payment.orderId));
            await db.insert(schema.orderEvents).values({ orderId: payment.orderId, type: "refund", message: `Remboursement confirmé par Stripe : ${(charge.amount_refunded / 100).toFixed(2)} €.`, isInternal: false });
          }
        }
        break;
      }
    }
    await db.insert(schema.webhookEvents).values({ id: event.id, provider: "stripe", type: event.type }).onConflictDoNothing();
  } catch (e) {
    console.error("[stripe webhook]", event.type, e);
    // 500 : Stripe renverra l'événement plus tard.
    return NextResponse.json({ error: "Traitement impossible" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
