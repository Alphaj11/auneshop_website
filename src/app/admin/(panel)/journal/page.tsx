import Link from "next/link";
import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { Empty, PageHeader, inputCls } from "@/components/admin/ui";
import { requireStaffPage } from "@/lib/auth/guards";
import { dateTimeFr } from "@/lib/labels";

export const metadata = { title: "Journal d'audit" };

export default async function AuditLog({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  await requireStaffPage("audit.view");
  const f = await searchParams;
  const page = Math.max(1, Number(f.page) || 1);
  const conds: SQL[] = [];
  if (f.action) conds.push(ilike(schema.auditLogs.action, `${f.action.replace(/[%_]/g, "")}%`));
  const rows = await db
    .select({ log: schema.auditLogs, email: schema.users.email })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(101)
    .offset((page - 1) * 100);

  return (
    <>
      <PageHeader title="Journal d'audit" description="Toutes les actions sensibles : connexions, paiements, remboursements, modifications du catalogue et des réglages." />
      <form className="mb-6 flex gap-3 rounded-lg border border-line bg-white/70 p-4">
        <input name="action" defaultValue={f.action} placeholder="Filtrer (ex. order, product, auth, settings)" className={`${inputCls} !w-80`} aria-label="Type d'action" />
        <button className="rounded bg-ink px-4 text-sm text-paper">Filtrer</button>
      </form>
      {rows.length === 0 ? (
        <Empty title="Aucune entrée" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white/70">
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Objet</th><th>IP</th><th>Détails</th></tr></thead>
            <tbody>
              {rows.slice(0, 100).map(({ log, email }) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-ink-soft">{dateTimeFr(log.createdAt)}</td>
                  <td>{email ?? <span className="text-ink-mute">système</span>}</td>
                  <td className="font-mono text-xs">{log.action}</td>
                  <td className="text-xs">
                    {log.entityType === "order" && log.entityId ? <Link href={`/admin/commandes/${log.entityId}`} className="underline">commande</Link>
                      : log.entityType === "product" && log.entityId ? <Link href={`/admin/produits/${log.entityId}`} className="underline">produit</Link>
                      : log.entityType}
                  </td>
                  <td className="font-mono text-xs text-ink-mute">{log.ip ?? ""}</td>
                  <td className="max-w-md truncate font-mono text-[11px] text-ink-soft" title={log.data ? JSON.stringify(log.data) : ""}>{log.data ? JSON.stringify(log.data) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav className="mt-4 flex justify-center gap-4 text-sm" aria-label="Pagination">
        {page > 1 && <Link href={`?${new URLSearchParams({ ...(f.action ? { action: f.action } : {}), page: String(page - 1) })}`} className="underline">Plus récents</Link>}
        {rows.length > 100 && <Link href={`?${new URLSearchParams({ ...(f.action ? { action: f.action } : {}), page: String(page + 1) })}`} className="underline">Plus anciens</Link>}
      </nav>
    </>
  );
}
