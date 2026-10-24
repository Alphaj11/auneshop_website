import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/guards";
import { StatusBadge, dateFr } from "@/lib/labels";
import { formatPrice } from "@/lib/money";

export const metadata = { title: "Mes commandes" };

export default async function OrdersPage() {
  const user = await requireUser("/compte/commandes");
  const orders = await db.query.orders.findMany({
    where: eq(schema.orders.userId, user.id),
    orderBy: [desc(schema.orders.createdAt)],
    with: { items: true },
  });
  if (!orders.length)
    return (
      <div className="rounded border border-dashed border-line p-10 text-center">
        <p className="display-md">Aucune commande pour le moment.</p>
        <Link href="/collections" className="btn btn-primary mt-6">Découvrir les collections</Link>
      </div>
    );
  return (
    <ul className="divide-y divide-line border-y border-line">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/compte/commandes/${o.number}`} className="grid grid-cols-2 items-center gap-3 py-5 hover:bg-paper-2/50 md:grid-cols-[1fr_1fr_auto_auto] md:px-3">
            <span>
              <span className="font-display text-lg">{o.number}</span>
              {o.isTest && <span className="ml-2 rounded bg-vanille/60 px-1.5 py-0.5 text-[10px] uppercase">Test</span>}
              <span className="block text-xs text-ink-soft">{o.items.reduce((n, i) => n + i.quantity, 0)} article(s)</span>
            </span>
            <span className="text-sm text-ink-soft">{dateFr(o.createdAt)}</span>
            <StatusBadge status={o.status} />
            <span className="text-right tabular-nums">{formatPrice(o.totalCents)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
