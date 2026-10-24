import Link from "next/link";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { Card, PageHeader, TestBadge } from "@/components/admin/ui";
import { requireStaffPage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { formatPrice } from "@/lib/money";

export const metadata = { title: "Recherche" };

export default async function AdminSearch({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireStaffPage("admin.access");
  const q = (await searchParams).q?.trim().slice(0, 100) ?? "";
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const has = q.length >= 2;
  const [orders, products, customers] = await Promise.all([
    has && can(user.role, "orders.view")
      ? db.query.orders.findMany({
          where: or(ilike(schema.orders.number, like), ilike(schema.orders.email, like), sql`${schema.orders.shippingAddress}->>'lastName' ilike ${like}`),
          limit: 10,
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        })
      : [],
    has && can(user.role, "products.manage")
      ? db.query.products.findMany({ where: or(ilike(schema.products.name, like), ilike(schema.products.slug, like)), limit: 10 })
      : [],
    has && can(user.role, "customers.view")
      ? db.query.users.findMany({
          where: and(eq(schema.users.role, "customer"), or(ilike(schema.users.email, like), ilike(schema.users.lastName, like), ilike(schema.users.firstName, like))),
          limit: 10,
          columns: { id: true, email: true, firstName: true, lastName: true },
        })
      : [],
  ]);

  return (
    <>
      <PageHeader title={q ? `Résultats pour « ${q} »` : "Recherche"} />
      {!has ? (
        <p className="text-sm text-ink-soft">Tapez au moins 2 caractères : numéro de commande, email, nom, produit.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title={`Commandes (${orders.length})`}>
            <ul className="space-y-2 text-sm">
              {orders.map((o) => (
                <li key={o.id}><Link href={`/admin/commandes/${o.id}`} className="font-medium hover:underline">{o.number}</Link> {o.isTest && <TestBadge />} <span className="text-ink-soft">{o.email} · {formatPrice(o.totalCents)}</span></li>
              ))}
              {!orders.length && <li className="text-ink-soft">Aucune.</li>}
            </ul>
          </Card>
          <Card title={`Produits (${products.length})`}>
            <ul className="space-y-2 text-sm">
              {products.map((p) => <li key={p.id}><Link href={`/admin/produits/${p.id}`} className="hover:underline">{p.name}</Link></li>)}
              {!products.length && <li className="text-ink-soft">Aucun.</li>}
            </ul>
          </Card>
          <Card title={`Clients (${customers.length})`}>
            <ul className="space-y-2 text-sm">
              {customers.map((c) => <li key={c.id}><Link href={`/admin/clients/${c.id}`} className="hover:underline">{[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}</Link> <span className="text-ink-soft">{c.email}</span></li>)}
              {!customers.length && <li className="text-ink-soft">Aucun.</li>}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
