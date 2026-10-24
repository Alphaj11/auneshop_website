import Link from "next/link";
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { Empty, PageHeader, inputCls } from "@/components/admin/ui";
import { requireStaffPage } from "@/lib/auth/guards";
import { dateFr } from "@/lib/labels";
import { formatPrice } from "@/lib/money";

export const metadata = { title: "Clients" };

export default async function CustomersAdmin({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaffPage("customers.view");
  const f = await searchParams;
  const page = Math.max(1, Number(f.page) || 1);
  const conds: SQL[] = [eq(schema.users.role, "customer"), isNull(schema.users.anonymizedAt)];
  if (f.q) {
    const like = `%${f.q.trim()}%`;
    conds.push(or(ilike(schema.users.email, like), ilike(schema.users.firstName, like), ilike(schema.users.lastName, like))!);
  }
  // Chiffre d'affaires : commandes payées hors tests uniquement.
  const paid = sql`o.user_id = ${schema.users.id} and o.payment_status in ('paid','partially_refunded') and not o.is_test`;
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      isActive: schema.users.isActive,
      createdAt: schema.users.createdAt,
      orders: sql<number>`(select count(*)::int from ${schema.orders} o where o.user_id = ${schema.users.id})`,
      spent: sql<number>`(select coalesce(sum(o.total_cents - coalesce((select sum(p.refunded_cents) from ${schema.payments} p where p.order_id = o.id), 0)), 0)::int from ${schema.orders} o where ${paid})`,
    })
    .from(schema.users)
    .where(and(...conds))
    .orderBy(desc(schema.users.createdAt))
    .limit(51)
    .offset((page - 1) * 50);
  const more = rows.length > 50;

  return (
    <>
      <PageHeader title="Clients" description="Comptes clients. Les achats sans compte apparaissent seulement dans les commandes." />
      <form className="mb-6 flex gap-3 rounded-lg border border-line bg-white/70 p-4">
        <input name="q" defaultValue={f.q} placeholder="Nom ou email" className={`${inputCls} !w-72`} aria-label="Recherche" />
        <button className="rounded bg-ink px-4 text-sm text-paper">Rechercher</button>
      </form>
      {rows.length === 0 ? (
        <Empty title="Aucun client" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white/70">
          <table className="admin-table">
            <thead><tr><th>Client</th><th>Inscription</th><th>Commandes</th><th className="text-right">Total payé (hors tests)</th></tr></thead>
            <tbody>
              {rows.slice(0, 50).map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/clients/${u.id}`} className="font-medium hover:underline">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</Link>
                    <span className="block text-xs text-ink-mute">{u.email}{!u.isActive && " · désactivé"}</span>
                  </td>
                  <td className="text-ink-soft">{dateFr(u.createdAt)}</td>
                  <td className="tabular-nums">{u.orders}</td>
                  <td className="text-right tabular-nums">{formatPrice(u.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="mt-4 flex justify-center gap-4 text-sm" aria-label="Pagination">
        {page > 1 && <Link href={`?${new URLSearchParams({ ...(f.q ? { q: f.q } : {}), page: String(page - 1) })}`} className="underline">Précédent</Link>}
        {more && <Link href={`?${new URLSearchParams({ ...(f.q ? { q: f.q } : {}), page: String(page + 1) })}`} className="underline">Suivant</Link>}
      </nav>
    </>
  );
}
