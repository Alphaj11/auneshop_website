import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card, PageHeader, btnDangerSm, btnSm, inputCls, labelCls } from "@/components/admin/ui";
import { saveDiscount } from "@/app/admin/actions/discounts";
import { requireStaffPage } from "@/lib/auth/guards";
import { centsToInput, formatPrice } from "@/lib/money";

export const metadata = { title: "Réductions" };

type D = typeof schema.discounts.$inferSelect;
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

function Fields({ d }: { d?: D }) {
  return (
    <>
      {d && <input type="hidden" name="id" value={d.id} />}
      <div><label className={labelCls}>Code</label><input name="code" defaultValue={d?.code} required className={`${inputCls} uppercase`} /></div>
      <div>
        <label className={labelCls}>Type</label>
        <select name="type" defaultValue={d?.type ?? "percent"} className={inputCls}>
          <option value="percent">Pourcentage</option>
          <option value="fixed">Montant fixe (€)</option>
          <option value="free_shipping">Livraison offerte</option>
        </select>
      </div>
      <div><label className={labelCls}>Valeur (% ou €)</label><input name="value" defaultValue={d ? (d.type === "fixed" ? centsToInput(d.value) : d.type === "percent" ? String(d.value) : "") : ""} className={inputCls} /></div>
      <div><label className={labelCls}>Minimum de commande (€)</label><input name="minSubtotal" defaultValue={d?.minSubtotalCents ? centsToInput(d.minSubtotalCents) : ""} className={inputCls} /></div>
      <div><label className={labelCls}>Début</label><input type="date" name="startsAt" defaultValue={day(d?.startsAt ?? null)} className={inputCls} /></div>
      <div><label className={labelCls}>Fin</label><input type="date" name="endsAt" defaultValue={day(d?.endsAt ?? null)} className={inputCls} /></div>
      <div><label className={labelCls}>Utilisations max.</label><input name="usageLimit" type="number" min={1} defaultValue={d?.usageLimit ?? ""} className={inputCls} /></div>
      <div className="sm:col-span-2 lg:col-span-4"><label className={labelCls}>Description interne</label><input name="description" defaultValue={d?.description} className={inputCls} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={d?.isActive ?? true} className="h-4 w-4" /> Actif</label>
    </>
  );
}

export default async function DiscountsAdmin() {
  await requireStaffPage("products.manage");
  const rows = await db.query.discounts.findMany({ orderBy: [desc(schema.discounts.createdAt)] });
  const describe = (d: D) =>
    d.type === "percent" ? `−${d.value} %` : d.type === "fixed" ? `−${formatPrice(d.value)}` : "Livraison offerte";

  return (
    <>
      <PageHeader title="Codes de réduction" description="Le compteur d'utilisation n'augmente qu'à la création d'une commande, dans la limite fixée." />
      <Card title="Nouveau code">
        <ActionForm action={saveDiscount} resetOnSuccess className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fields />
          <div className="flex items-end"><Submit className="rounded bg-ink px-4 py-2 text-sm text-paper">Créer</Submit></div>
        </ActionForm>
      </Card>
      <div className="mt-6 space-y-3">
        {rows.map((d) => (
          <details key={d.id} className="rounded-lg border border-line bg-white/70">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <span><strong className="font-mono">{d.code}</strong> · {describe(d)}{d.minSubtotalCents > 0 && ` dès ${formatPrice(d.minSubtotalCents)}`}</span>
              <span className="text-ink-soft">{d.usedCount}{d.usageLimit ? ` / ${d.usageLimit}` : ""} utilisation(s) · {d.isActive ? "actif" : "inactif"}</span>
            </summary>
            <ActionForm action={saveDiscount} className="grid gap-3 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Fields d={d} />
              <div className="flex items-end gap-2">
                <Submit className={btnSm} name="op" value="save">Enregistrer</Submit>
                <Submit className={btnDangerSm} name="op" value="delete">Supprimer</Submit>
              </div>
            </ActionForm>
          </details>
        ))}
      </div>
    </>
  );
}
