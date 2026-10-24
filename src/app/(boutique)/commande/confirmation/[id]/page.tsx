import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { OrderSummary } from "@/components/shop/OrderSummary";
import { AutoRefresh } from "@/components/shop/AutoRefresh";
import { verifyOrderAccessToken } from "@/lib/order-token";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Confirmation de commande", robots: { index: false } };

/**
 * L'état affiché vient TOUJOURS de la base de données (mise à jour par le webhook),
 * jamais du simple retour du navigateur depuis la page de paiement.
 */
export default async function ConfirmationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, id), with: { items: true } });
  if (!order) notFound();
  if (!verifyOrderAccessToken(id, t) && !(user && order.userId === user.id)) notFound();
  const settings = await getSettings();
  const paid = order.paymentStatus === "paid";
  const failed = order.status === "cancelled";

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-10 pt-28 md:px-10 md:pt-36">
      {paid ? (
        <>
          <p className="eyebrow">Commande {order.number}</p>
          <h1 className="display-lg mt-3">Merci, votre commande est confirmée.</h1>
          <p className="mt-4 max-w-xl text-ink-soft">
            Un email de confirmation a été envoyé à {order.email}. {settings.shipping.delayText}
          </p>
          {order.paymentMode === "demo" && (
            <p className="mt-6 rounded border-2 border-dashed border-terre p-4 text-sm">
              Commande de démonstration : le paiement a été simulé, rien n&apos;a été encaissé et rien ne sera expédié.
            </p>
          )}
        </>
      ) : failed ? (
        <>
          <h1 className="display-lg">Le paiement n&apos;a pas abouti.</h1>
          <p className="mt-4 text-ink-soft">Votre commande {order.number} a été annulée et votre panier est conservé.</p>
          <Link href="/panier" className="btn btn-primary mt-8">Retour au panier</Link>
        </>
      ) : (
        <>
          <AutoRefresh seconds={4} />
          <h1 className="display-lg">Paiement en cours de confirmation…</h1>
          <p className="mt-4 max-w-xl text-ink-soft" role="status">
            Nous attendons la confirmation du prestataire de paiement. Cette page se met à jour automatiquement. Vous recevrez un email dès que le paiement sera validé.
          </p>
        </>
      )}
      <div className="mt-14">
        <OrderSummary order={order} />
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/collections" className="btn btn-ghost">Continuer mes achats</Link>
        {user && <Link href={`/compte/commandes/${order.number}`} className="btn btn-primary">Suivre ma commande</Link>}
      </div>
    </div>
  );
}
