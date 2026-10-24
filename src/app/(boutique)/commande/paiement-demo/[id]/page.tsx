import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { simulatePayment } from "@/app/actions/demo-payment";
import { verifyOrderAccessToken } from "@/lib/order-token";
import { currentPaymentMode } from "@/lib/orders";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "Paiement de démonstration", robots: { index: false } };

export default async function DemoPaymentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  if (currentPaymentMode() !== "demo" || !verifyOrderAccessToken(id, t)) notFound();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
  if (!order || order.paymentMode !== "demo") notFound();
  const token = t!;

  return (
    <div className="mx-auto max-w-xl px-5 pb-10 pt-32 md:pt-40">
      <div className="rounded-lg border-2 border-dashed border-terre bg-paper p-8" data-testid="demo-payment">
        <p className="inline-block rounded-full bg-terre px-3 py-1 text-xs uppercase tracking-[0.2em] text-paper">Démonstration — aucun paiement réel</p>
        <h1 className="display-md mt-6">Simulateur de paiement</h1>
        <p className="mt-3 text-sm text-ink-soft">
          Cette page remplace le prestataire de paiement tant que les clés Stripe ne sont pas configurées. Aucune carte n&apos;est demandée, aucun argent n&apos;est encaissé. La commande reste marquée « test ».
        </p>
        <dl className="mt-6 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Commande</dt><dd>{order.number}</dd></div>
          <div className="flex justify-between font-medium"><dt>Montant</dt><dd>{formatPrice(order.totalCents)}</dd></div>
          <div className="flex justify-between"><dt>Statut</dt><dd>{order.paymentStatus === "paid" ? "Déjà payée" : order.status === "cancelled" ? "Annulée" : "En attente"}</dd></div>
        </dl>
        {order.status === "pending_payment" && (
          <div className="mt-8 flex flex-col gap-3">
            <form action={simulatePayment.bind(null, id, token, "success")}>
              <button className="btn btn-primary w-full" data-testid="demo-pay-success">Simuler un paiement accepté</button>
            </form>
            <form action={simulatePayment.bind(null, id, token, "failure")}>
              <button className="btn btn-ghost w-full">Simuler un paiement refusé</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
