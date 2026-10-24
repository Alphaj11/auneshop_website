import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card, PageHeader, TestBadge, btnDangerSm, btnSm, inputCls } from "@/components/admin/ui";
import { anonymizeCustomer, setCustomerActive } from "@/app/admin/actions/customers";
import { requireStaffPage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { StatusBadge, dateFr, dateTimeFr, paymentStatusLabels } from "@/lib/labels";
import { formatPrice } from "@/lib/money";

export const metadata = { title: "Client" };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireStaffPage("customers.view");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, id), columns: { passwordHash: false } });
  if (!user || user.role !== "customer") notFound();
  const [profile, addresses, orders, newsletter, inquiries] = await Promise.all([
    db.query.customerProfiles.findFirst({ where: eq(schema.customerProfiles.userId, id) }),
    db.query.addresses.findMany({ where: eq(schema.addresses.userId, id) }),
    db.query.orders.findMany({ where: eq(schema.orders.userId, id), orderBy: [desc(schema.orders.createdAt)], limit: 50 }),
    db.query.newsletterSubscribers.findFirst({ where: sql`lower(${schema.newsletterSubscribers.email}) = lower(${user.email})` }),
    db.query.inquiries.findMany({ where: eq(schema.inquiries.userId, id), orderBy: [desc(schema.inquiries.createdAt)], limit: 20 }),
  ]);
  const manage = can(admin.role, "customers.manage");
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <>
      <PageHeader
        title={user.anonymizedAt ? "Compte anonymisé" : name}
        back={{ href: "/admin/clients", label: "Clients" }}
        description={user.anonymizedAt ? `Anonymisé le ${dateFr(user.anonymizedAt)}` : `${user.email} · client depuis le ${dateFr(user.createdAt)}`}
        actions={manage && !user.anonymizedAt && <a href={`/admin/clients/${id}/export`} className={btnSm}>Exporter ses données (RGPD)</a>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title={`Commandes (${orders.length})`}>
            {orders.length === 0 ? (
              <p className="text-sm text-ink-soft">Aucune commande.</p>
            ) : (
              <table className="admin-table">
                <thead><tr><th>N°</th><th>Date</th><th>Paiement</th><th>Statut</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td><Link href={`/admin/commandes/${o.id}`} className="font-medium hover:underline">{o.number}</Link> {o.isTest && <TestBadge />}</td>
                      <td className="text-ink-soft">{dateTimeFr(o.createdAt)}</td>
                      <td><StatusBadge status={o.paymentStatus} labels={paymentStatusLabels} /></td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="text-right tabular-nums">{formatPrice(o.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card title="Messages">
            {inquiries.length === 0 ? <p className="text-sm text-ink-soft">Aucun message.</p> : (
              <ul className="space-y-3 text-sm">
                {inquiries.map((q) => (
                  <li key={q.id}><Link href={`/admin/messages?id=${q.id}`} className="font-medium hover:underline">{q.subject}</Link> <span className="text-ink-mute">· {dateTimeFr(q.createdAt)} · {q.status === "open" ? "ouvert" : "traité"}</span></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Coordonnées">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-ink-mute">Téléphone</dt><dd>{profile?.phone || "—"}</dd></div>
              <div><dt className="text-ink-mute">Newsletter</dt><dd>{newsletter?.status === "subscribed" ? `Inscrit·e le ${dateFr(newsletter.consentAt)}` : "Non inscrit·e"}</dd></div>
              <div><dt className="text-ink-mute">Dernière connexion</dt><dd>{user.lastLoginAt ? dateTimeFr(user.lastLoginAt) : "—"}</dd></div>
              <div><dt className="text-ink-mute">Statut du compte</dt><dd>{user.isActive ? "Actif" : "Désactivé"}</dd></div>
            </dl>
          </Card>
          <Card title="Adresses">
            {addresses.length === 0 ? <p className="text-sm text-ink-soft">Aucune adresse enregistrée.</p> : (
              <ul className="space-y-3 text-sm">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <p className="font-medium">{a.label}{a.isDefault && " (par défaut)"}</p>
                    <p className="text-ink-soft">{a.firstName} {a.lastName}, {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.postalCode} {a.city}, {a.country}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {manage && !user.anonymizedAt && (
            <Card title="Actions sur le compte">
              <div className="space-y-5">
                <ActionForm action={setCustomerActive}>
                  <input type="hidden" name="id" value={user.id} />
                  <input type="hidden" name="active" value={user.isActive ? "0" : "1"} />
                  <Submit className={btnSm}>{user.isActive ? "Désactiver le compte" : "Réactiver le compte"}</Submit>
                </ActionForm>
                <ActionForm action={anonymizeCustomer} confirm="Effacer définitivement les données personnelles de ce client ?" className="space-y-2 border-t border-line pt-4">
                  <input type="hidden" name="id" value={user.id} />
                  <p className="text-xs text-ink-soft">Droit à l&apos;effacement : supprime nom, email, adresses, favoris et inscription newsletter. Les commandes restent (obligations comptables), sans lien avec le compte.</p>
                  <input name="confirm" placeholder="Recopiez l'email pour confirmer" className={inputCls} aria-label="Confirmation par email" autoComplete="off" />
                  <Submit className={btnDangerSm}>Anonymiser</Submit>
                </ActionForm>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
