import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card, Empty, PageHeader, btnSm, inputCls } from "@/components/admin/ui";
import { replyInquiry } from "@/app/admin/actions/messages";
import { requireStaffPage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { dateFr, dateTimeFr } from "@/lib/labels";

export const metadata = { title: "Messages" };

export default async function MessagesAdmin({ searchParams }: { searchParams: Promise<{ vue?: string; statut?: string }> }) {
  const user = await requireStaffPage("orders.view");
  const f = await searchParams;
  const tab = f.vue === "newsletter" ? "newsletter" : "messages";
  const canReply = can(user.role, "orders.manage");

  const [inquiries, subscribers, counts] = await Promise.all([
    tab === "messages"
      ? db.query.inquiries.findMany({
          where: f.statut === "tous" ? undefined : eq(schema.inquiries.status, "open"),
          orderBy: [desc(schema.inquiries.createdAt)],
          limit: 100,
        })
      : [],
    tab === "newsletter" && can(user.role, "customers.view")
      ? db.query.newsletterSubscribers.findMany({ orderBy: [desc(schema.newsletterSubscribers.createdAt)], limit: 500, columns: { unsubscribeToken: false } })
      : [],
    db
      .select({
        open: sql<number>`(select count(*)::int from ${schema.inquiries} where status = 'open')`,
        subs: sql<number>`(select count(*)::int from ${schema.newsletterSubscribers} where status = 'subscribed')`,
      })
      .from(sql`(select 1) x`),
  ]);
  const orderNumbers = new Map(
    (
      await Promise.all(
        [...new Set(inquiries.map((i) => i.orderId).filter((x): x is string => !!x))].map((id) =>
          db.query.orders.findFirst({ where: eq(schema.orders.id, id), columns: { id: true, number: true } }),
        ),
      )
    )
      .filter((o) => !!o)
      .map((o) => [o!.id, o!.number]),
  );

  return (
    <>
      <PageHeader title="Messages" />
      <nav className="mb-6 flex gap-2 text-sm" aria-label="Onglets">
        <Link href="/admin/messages" className={`rounded px-3 py-1.5 ${tab === "messages" ? "bg-ink text-paper" : "border border-line bg-white"}`}>Questions clients ({counts[0].open} ouvertes)</Link>
        {can(user.role, "customers.view") && (
          <Link href="/admin/messages?vue=newsletter" className={`rounded px-3 py-1.5 ${tab === "newsletter" ? "bg-ink text-paper" : "border border-line bg-white"}`}>Newsletter ({counts[0].subs} inscrits)</Link>
        )}
      </nav>

      {tab === "messages" ? (
        <>
          <div className="mb-4 text-sm">
            {f.statut === "tous" ? <Link href="/admin/messages" className="underline">Voir seulement les ouverts</Link> : <Link href="/admin/messages?statut=tous" className="underline">Voir tous les messages</Link>}
          </div>
          {inquiries.length === 0 ? (
            <Empty title="Aucun message en attente" />
          ) : (
            <div className="space-y-4">
              {inquiries.map((q) => (
                <Card key={q.id} title={q.subject} actions={<span className="text-xs text-ink-mute">{dateTimeFr(q.createdAt)}</span>}>
                  <p className="text-sm">
                    <strong>{q.name}</strong> · <a href={`mailto:${q.email}`} className="underline">{q.email}</a>
                    {q.orderId && <> · commande <Link href={`/admin/commandes/${q.orderId}`} className="underline">{orderNumbers.get(q.orderId) ?? "voir"}</Link></>}
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm">{q.message}</p>
                  {canReply && (
                    <ActionForm action={replyInquiry} resetOnSuccess className="mt-4 space-y-2 border-t border-line pt-4">
                      <input type="hidden" name="id" value={q.id} />
                      <textarea name="reply" rows={3} placeholder="Votre réponse (envoyée par email)" className={inputCls} aria-label="Réponse" />
                      <div className="flex gap-2">
                        <Submit className="rounded bg-ink px-4 py-1.5 text-sm text-paper" name="op" value="reply">Répondre et clore</Submit>
                        <Submit className={btnSm} name="op" value={q.status === "open" ? "close" : "reopen"}>{q.status === "open" ? "Marquer comme traité" : "Rouvrir"}</Submit>
                      </div>
                    </ActionForm>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <Card title="Inscrits à la newsletter" actions={can(user.role, "customers.manage") && <a href="/admin/messages/newsletter" className={btnSm}>Exporter en CSV</a>}>
          {subscribers.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucun inscrit.</p>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Email</th><th>Statut</th><th>Consentement</th><th>Source</th></tr></thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.id}>
                    <td>{s.email}</td>
                    <td>{s.status === "subscribed" ? "Inscrit" : `Désinscrit${s.unsubscribedAt ? ` le ${dateFr(s.unsubscribedAt)}` : ""}`}</td>
                    <td className="text-ink-soft">{dateFr(s.consentAt)}</td>
                    <td className="text-ink-soft">{s.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  );
}
