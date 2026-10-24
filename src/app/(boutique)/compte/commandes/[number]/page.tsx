import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { InquiryForm } from "@/components/account/AccountForms";
import { OrderSummary } from "@/components/shop/OrderSummary";
import { requireUser } from "@/lib/auth/guards";
import { StatusBadge, dateFr } from "@/lib/labels";

export const metadata = { title: "Détail de commande" };

export default async function OrderDetail({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/compte/commandes/${number}`);
  const order = await db.query.orders.findFirst({
    where: and(eq(schema.orders.number, number), eq(schema.orders.userId, user.id)),
    with: { items: true, shipments: true, events: { where: eq(schema.orderEvents.isInternal, false), orderBy: (e, { desc }) => [desc(e.createdAt)] } },
  });
  if (!order) notFound();
  const steps = ["paid", "processing", "shipped", "delivered"];
  const reached = steps.indexOf(order.status);
  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/compte/commandes" className="link-underline text-sm text-ink-soft">← Toutes les commandes</Link>
          <h2 className="display-md mt-3">Commande {order.number}</h2>
          <p className="text-sm text-ink-soft">Passée le {dateFr(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      {!["cancelled", "refunded", "pending_payment"].includes(order.status) && (
        <ol className="grid grid-cols-4 gap-2 text-xs" aria-label="Suivi de la commande">
          {["Payée", "En préparation", "Expédiée", "Livrée"].map((label, i) => (
            <li key={label} className="space-y-2">
              <span className={`block h-1 rounded-full ${i <= reached ? "bg-ink" : "bg-line"}`} />
              <span className={i <= reached ? "" : "text-ink-mute"}>{label}</span>
            </li>
          ))}
        </ol>
      )}
      {order.shipments.map((s) => (
        <p key={s.id} className="rounded bg-paper-2 p-4 text-sm">
          Expédié via {s.carrier}{s.trackingNumber ? ` · n° de suivi ${s.trackingNumber}` : ""}{" "}
          {s.trackingUrl && <a href={s.trackingUrl} className="underline" target="_blank" rel="noopener noreferrer">Suivre le colis</a>}
        </p>
      ))}
      <OrderSummary order={order} />
      <section aria-labelledby="question" className="border-t border-line pt-10">
        <h3 id="question" className="display-md mb-6">Une question sur cette commande ?</h3>
        <InquiryForm orderId={order.id} name={`${user.firstName} ${user.lastName}`.trim()} email={user.email} subject={`Commande ${order.number}`} />
      </section>
    </div>
  );
}
