import Link from "next/link";
import { Empty, PageHeader, TestBadge, inputCls } from "@/components/admin/ui";
import { requireStaffPage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { StatusBadge, dateTimeFr, orderStatusLabels, paymentStatusLabels } from "@/lib/labels";
import { formatPrice } from "@/lib/money";
import { findOrders, type OrderFilters } from "./query";

export const metadata = { title: "Commandes" };

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<OrderFilters> }) {
  const user = await requireStaffPage("orders.view");
  const f = await searchParams;
  const { rows, total, page, pages } = await findOrders(f);
  const qs = (p: Partial<OrderFilters>) => new URLSearchParams(Object.entries({ ...f, ...p }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Commandes"
        description={`${total} commande(s)`}
        actions={can(user.role, "orders.export") && <a href={`/admin/commandes/export?${qs({ page: undefined })}`} className="rounded border border-line bg-white px-4 py-2 text-sm hover:border-ink">Exporter en CSV</a>}
      />
      <form className="mb-6 grid gap-3 rounded-lg border border-line bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-8">
        <input name="q" defaultValue={f.q} placeholder="N°, email ou nom" className={`${inputCls} lg:col-span-2`} aria-label="Recherche" />
        <select name="statut" defaultValue={f.statut ?? ""} className={inputCls} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {Object.entries(orderStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="paiement" defaultValue={f.paiement ?? ""} className={inputCls} aria-label="Paiement">
          <option value="">Tous les paiements</option>
          {Object.entries(paymentStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" name="du" defaultValue={f.du} className={inputCls} aria-label="Du" />
        <input type="date" name="au" defaultValue={f.au} className={inputCls} aria-label="Au" />
        <div className="flex gap-2">
          <input name="min" defaultValue={f.min} placeholder="Min €" className={inputCls} aria-label="Montant minimum" />
          <input name="max" defaultValue={f.max} placeholder="Max €" className={inputCls} aria-label="Montant maximum" />
        </div>
        <div className="flex gap-2">
          <select name="tests" defaultValue={f.tests ?? ""} className={inputCls} aria-label="Commandes de test">
            <option value="">Tests inclus</option>
            <option value="exclure">Sans les tests</option>
            <option value="seulement">Tests seulement</option>
          </select>
          <button className="rounded bg-ink px-4 text-sm text-paper">Filtrer</button>
        </div>
      </form>
      {rows.length === 0 ? (
        <Empty title="Aucune commande" text="Aucune commande ne correspond à ces filtres." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white/70">
          <table className="admin-table">
            <thead>
              <tr><th>N°</th><th>Date</th><th>Client</th><th>Articles</th><th>Paiement</th><th>Traitement</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap"><Link href={`/admin/commandes/${o.id}`} className="font-medium hover:underline">{o.number}</Link> {o.isTest && <TestBadge />}</td>
                  <td className="whitespace-nowrap text-ink-soft">{dateTimeFr(o.createdAt)}</td>
                  <td>{o.shippingAddress.firstName} {o.shippingAddress.lastName}<br /><span className="text-xs text-ink-mute">{o.email}</span></td>
                  <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td><StatusBadge status={o.paymentStatus} labels={paymentStatusLabels} /></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-right tabular-nums">{formatPrice(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
          {page > 1 && <Link href={`?${qs({ page: String(page - 1) })}`} className="underline">Précédent</Link>}
          <span>Page {page} / {pages}</span>
          {page < pages && <Link href={`?${qs({ page: String(page + 1) })}`} className="underline">Suivant</Link>}
        </nav>
      )}
    </>
  );
}
