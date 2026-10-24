import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { verifyOrderAccessToken } from "@/lib/order-token";
import { failOrderPayment } from "@/lib/orders";
import { stripe } from "@/lib/payments/stripe";

export const metadata: Metadata = { title: "Paiement annulé", robots: { index: false } };

export default async function CancelledPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  if (!verifyOrderAccessToken(id, t)) notFound();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
  if (!order) notFound();
  // Retour volontaire depuis la page de paiement : on libère le stock tout de suite
  // (sauf si le paiement a été confirmé entre-temps : failOrderPayment ne touche pas une commande payée).
  if (order.status === "pending_payment") {
    // Ferme aussi la session Stripe pour qu'elle ne puisse plus être payée.
    const pending = await db.query.payments.findFirst({ where: eq(schema.payments.orderId, order.id) });
    if (pending?.provider === "stripe" && pending.status === "pending") {
      try {
        await stripe().checkout.sessions.expire(pending.providerRef);
      } catch {
        // déjà expirée ou payée : le webhook fera foi
      }
    }
    const fresh = await db.query.orders.findFirst({ where: eq(schema.orders.id, order.id) });
    if (fresh?.status === "pending_payment") await failOrderPayment(order.id, "Paiement abandonné par le client.", "cancelled", pending?.providerRef);
  }
  return (
    <div className="mx-auto max-w-xl px-5 pb-10 pt-40 text-center">
      <h1 className="display-lg">Paiement annulé</h1>
      <p className="mt-4 text-ink-soft">Aucun montant n&apos;a été débité. Votre panier est toujours là si vous souhaitez réessayer.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/panier" className="btn btn-primary">Retour au panier</Link>
        <Link href="/collections" className="btn btn-ghost">Collections</Link>
      </div>
    </div>
  );
}
