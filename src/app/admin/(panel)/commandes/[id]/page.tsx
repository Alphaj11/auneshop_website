import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card, PageHeader, TestBadge, btnDangerSm, btnPrimarySm, inputCls, labelCls } from "@/components/admin/ui";
import { addOrderNote, addShipment, cancelOrder, refundOrder, updateOrderStatus } from "@/app/admin/actions/orders";
import { requireStaffPage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { StatusBadge, dateTimeFr, orderStatusLabels, paymentModeLabels, paymentStatusLabels } from "@/lib/labels";
import { formatPrice } from "@/lib/money";

export const metadata = { title: "Commande" };

const next: Record<string, string[]> = { paid: ["processing"], processing: ["shipped", "paid"], shipped: ["delivered", "processing"], delivered: ["shipped"] };

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage("orders.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    with: { items: true, payments: true, shipments: true, events: { with: { user: { columns: { email: true, firstName: true } } }, orderBy: (e, { desc }) => [desc(e.createdAt)] }, user: { columns: { id: true, email: true, firstName: true, lastName: true } } },
  });
  if (!order) notFound();
  const manage = can(user.role, "orders.manage");
  const refund = can(user.role, "orders.refund");
  const paid = order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded";
  const a = order.shippingAddress;
  const refundable = order.payments.reduce((s, p) => s + (p.status === "paid" || p.status === "partially_refunded" ? p.amountCents - p.refundedCents : 0), 0);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/commandes", label: "Commandes" }}
        title={`Commande ${order.number}`}
        description={`Passée le ${dateTimeFr(order.createdAt)}`}
        actions={<><StatusBadge status={order.paymentStatus} labels={paymentStatusLabels} /><StatusBadge status={order.status} />{order.isTest && <TestBadge />}</>}
      />
      {order.paymentMode !== "stripe_live" && (
        <p className="mb-6 rounded border border-vanille bg-vanille/30 p-3 text-sm">
          {paymentModeLabels[order.paymentMode]} — commande de test : ne pas expédier. Les remboursements sont {order.paymentMode === "demo" ? "simulés" : "effectués dans l'environnement de test Stripe"}.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title={`Articles (${order.items.reduce((n, i) => n + i.quantity, 0)})`}>
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <div className="h-14 w-12 shrink-0 overflow-hidden rounded bg-paper-2">
                    {i.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.imageUrl} alt="" className="h-full w-full object-contain" />
                    )}
                  </div>
                  <div className="flex-1 text-sm">
                    {i.productId ? <Link href={`/admin/produits/${i.productId}`} className="font-medium hover:underline">{i.productName}</Link> : <span className="font-medium">{i.productName}</span>}
                    <p className="text-ink-soft">{i.variantLabel} · SKU {i.sku}</p>
                  </div>
                  <p className="text-sm tabular-nums">{i.quantity} × {formatPrice(i.unitPriceCents)}</p>
                  <p className="w-24 text-right text-sm tabular-nums">{formatPrice(i.lineTotalCents)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt>Sous-total</dt><dd>{formatPrice(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && <div className="flex justify-between"><dt>Réduction ({order.discountCode})</dt><dd>−{formatPrice(order.discountCents)}</dd></div>}
              <div className="flex justify-between"><dt>Livraison ({order.shippingMethod})</dt><dd>{formatPrice(order.shippingCents)}</dd></div>
              <div className="flex justify-between font-medium"><dt>Total TTC</dt><dd>{formatPrice(order.totalCents)}</dd></div>
              <div className="flex justify-between text-xs text-ink-mute"><dt>Dont TVA</dt><dd>{formatPrice(order.taxCents)}</dd></div>
            </dl>
          </Card>

          {manage && (
            <Card title="Traitement et expédition">
              <div className="grid gap-6 md:grid-cols-2">
                <ActionForm action={updateOrderStatus} className="space-y-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <label className={labelCls} htmlFor="status">Statut de traitement</label>
                  {paid && next[order.status] ? (
                    <div className="flex gap-2">
                      <select id="status" name="status" className={inputCls}>
                        {next[order.status].map((s) => <option key={s} value={s}>{orderStatusLabels[s]}</option>)}
                      </select>
                      <Submit className={btnPrimarySm}>Appliquer</Submit>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-soft">{paid ? "Aucune transition disponible." : "Disponible une fois le paiement confirmé par le prestataire. Un changement manuel ne vaut jamais preuve de paiement."}</p>
                  )}
                </ActionForm>
                {paid && (
                  <ActionForm action={addShipment} className="space-y-3" resetOnSuccess>
                    <input type="hidden" name="orderId" value={order.id} />
                    <p className={labelCls}>Ajouter un suivi d&apos;expédition</p>
                    <input name="carrier" defaultValue="Colissimo" className={inputCls} aria-label="Transporteur" required />
                    <input name="trackingNumber" placeholder="Numéro de suivi" className={inputCls} aria-label="Numéro de suivi" />
                    <input name="trackingUrl" placeholder="Lien de suivi (https://…)" className={inputCls} aria-label="Lien de suivi" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked /> Prévenir le client par email</label>
                    <Submit className={btnPrimarySm}>Enregistrer l&apos;expédition</Submit>
                  </ActionForm>
                )}
              </div>
              {order.shipments.length > 0 && (
                <ul className="mt-6 space-y-1 border-t border-line pt-4 text-sm">
                  {order.shipments.map((s) => (
                    <li key={s.id}>{s.carrier} · {s.trackingNumber ?? "sans n°"} · {s.shippedAt ? dateTimeFr(s.shippedAt) : ""} {s.trackingUrl && <a href={s.trackingUrl} className="underline" target="_blank" rel="noopener noreferrer">suivi</a>}</li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card title="Historique">
            {manage && (
              <ActionForm action={addOrderNote} className="mb-5 flex gap-2" resetOnSuccess>
                <input type="hidden" name="orderId" value={order.id} />
                <input name="note" placeholder="Ajouter une note interne…" className={inputCls} aria-label="Note interne" />
                <Submit className={btnPrimarySm} pendingLabel="…">Ajouter</Submit>
              </ActionForm>
            )}
            <ol className="space-y-3 text-sm">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.type === "note" ? "bg-vanille" : e.type === "payment" ? "bg-success" : e.type === "refund" ? "bg-danger" : "bg-ink/40"}`} aria-hidden />
                  <div>
                    <p>{e.message}</p>
                    <p className="text-xs text-ink-mute">
                      {dateTimeFr(e.createdAt)} · {e.user ? e.user.firstName || e.user.email : "Système"} {e.isInternal ? "· interne" : "· visible du client"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Client">
            <p className="text-sm">{a.firstName} {a.lastName}<br /><a href={`mailto:${order.email}`} className="underline">{order.email}</a>{a.phone && <><br />{a.phone}</>}</p>
            {order.user ? <Link href={`/admin/clients/${order.user.id}`} className="mt-3 inline-block text-sm underline">Fiche client</Link> : <p className="mt-3 text-xs text-ink-mute">Achat invité</p>}
            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink-soft">Adresse de livraison</p>
            <p className="mt-1 text-sm leading-relaxed">{a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.postalCode} {a.city}<br />{a.country}</p>
            {order.customerNote && <p className="mt-4 rounded bg-paper-2 p-3 text-sm">Note du client : {order.customerNote}</p>}
          </Card>
          <Card title="Paiement">
            <p className="text-sm">{paymentModeLabels[order.paymentMode]}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {order.payments.map((p) => (
                <li key={p.id} className="rounded border border-line p-3">
                  <div className="flex justify-between"><span>{p.provider === "stripe" ? "Stripe" : "Démo"}</span><StatusBadge status={p.status} labels={paymentStatusLabels} /></div>
                  <p className="mt-1 break-all text-xs text-ink-mute">{p.paymentIntentId ?? p.providerRef}</p>
                  <p className="mt-1 text-xs">{formatPrice(p.amountCents)}{p.refundedCents > 0 && ` · remboursé ${formatPrice(p.refundedCents)}`}</p>
                </li>
              ))}
              {!order.payments.length && <li className="text-ink-soft">Aucun paiement enregistré.</li>}
            </ul>
            {refund && paid && refundable > 0 && (
              <ActionForm action={refundOrder} className="mt-5 space-y-3 border-t border-line pt-4" confirm="Confirmer le remboursement ?">
                <input type="hidden" name="orderId" value={order.id} />
                <label className={labelCls} htmlFor="amount">Montant à rembourser (vide = {formatPrice(refundable)})</label>
                <input id="amount" name="amount" placeholder="ex. 45,00" className={inputCls} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="restock" /> Remettre les articles en stock</label>
                <Submit className={btnDangerSm}>Rembourser</Submit>
              </ActionForm>
            )}
          </Card>
          {manage && !paid && order.status !== "cancelled" && order.status !== "refunded" && (
            <Card title="Annulation">
              <ActionForm action={cancelOrder} className="space-y-3" confirm="Annuler cette commande et restituer le stock ?">
                <input type="hidden" name="orderId" value={order.id} />
                <input name="reason" placeholder="Motif (facultatif)" className={inputCls} aria-label="Motif" />
                <Submit className={btnDangerSm}>Annuler la commande</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
