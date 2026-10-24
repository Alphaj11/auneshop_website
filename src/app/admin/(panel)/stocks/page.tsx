import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card, Empty, PageHeader, inputCls } from "@/components/admin/ui";
import { adjustStock } from "@/app/admin/actions/inventory";
import { requireStaffPage } from "@/lib/auth/guards";
import { dateTimeFr } from "@/lib/labels";

export const metadata = { title: "Stocks" };

const reasonLabels: Record<string, string> = {
  initial: "Stock initial",
  order: "Commande",
  order_cancelled: "Commande annulée",
  manual: "Correction manuelle",
  return: "Retour client",
  restock: "Réassort",
};

type F = { q?: string; filtre?: string; variante?: string };

export default async function StockAdmin({ searchParams }: { searchParams: Promise<F> }) {
  await requireStaffPage("inventory.manage");
  const f = await searchParams;
  if (f.variante && !/^[0-9a-f-]{36}$/i.test(f.variante)) f.variante = undefined;
  const conds: SQL[] = [eq(schema.productVariants.trackInventory, true), sql`${schema.products.status} <> 'archived'`];
  if (f.q) conds.push(or(ilike(schema.products.name, `%${f.q}%`), ilike(schema.productVariants.sku, `%${f.q}%`))!);
  if (f.filtre === "bas") conds.push(sql`${schema.productVariants.stock} <= ${schema.productVariants.lowStockThreshold}`);
  if (f.filtre === "epuise") conds.push(eq(schema.productVariants.stock, 0));

  const rows = await db
    .select({
      id: schema.productVariants.id,
      sku: schema.productVariants.sku,
      size: schema.productVariants.size,
      color: schema.productVariants.color,
      stock: schema.productVariants.stock,
      threshold: schema.productVariants.lowStockThreshold,
      isActive: schema.productVariants.isActive,
      productId: schema.products.id,
      productName: schema.products.name,
      reserved: sql<number>`coalesce((select sum(oi.quantity)::int from ${schema.orderItems} oi join ${schema.orders} o on o.id = oi.order_id where oi.variant_id = ${schema.productVariants.id} and o.status = 'pending_payment' and o.stock_reserved), 0)`,
    })
    .from(schema.productVariants)
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(and(...conds))
    .orderBy(schema.productVariants.stock, schema.products.name)
    .limit(400);

  const history = f.variante
    ? await db.query.inventoryMovements.findMany({
        where: eq(schema.inventoryMovements.variantId, f.variante),
        orderBy: [desc(schema.inventoryMovements.createdAt)],
        limit: 100,
        with: { variant: { columns: { sku: true } } },
      })
    : await db.query.inventoryMovements.findMany({ orderBy: [desc(schema.inventoryMovements.createdAt)], limit: 25, with: { variant: { columns: { sku: true } } } });

  return (
    <>
      <PageHeader title="Stocks" description="Le stock est réservé à la création d'une commande et rendu si elle est annulée ou expire sans paiement." />
      <form className="mb-6 flex flex-wrap gap-3 rounded-lg border border-line bg-white/70 p-4">
        <input name="q" defaultValue={f.q} placeholder="Produit ou SKU" className={`${inputCls} !w-64`} aria-label="Recherche" />
        <select name="filtre" defaultValue={f.filtre ?? ""} className={`${inputCls} !w-auto`} aria-label="Filtre">
          <option value="">Toutes les variantes suivies</option>
          <option value="bas">Stock bas</option>
          <option value="epuise">Épuisées</option>
        </select>
        <button className="rounded bg-ink px-4 text-sm text-paper">Filtrer</button>
      </form>

      {rows.length === 0 ? (
        <Empty title="Rien à afficher" text="Aucune variante suivie ne correspond. Les pièces fabriquées à la commande ne sont pas suivies en stock." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white/70">
          <table className="admin-table">
            <thead>
              <tr><th>Produit</th><th>SKU</th><th>Stock</th><th>Réservé</th><th>Ajuster</th><th><span className="sr-only">Historique</span></th></tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td>
                    <Link href={`/admin/produits/${v.productId}`} className="hover:underline">{v.productName}</Link>
                    <span className="block text-xs text-ink-mute">{v.color} / {v.size}{!v.isActive && " · inactive"}</span>
                  </td>
                  <td className="font-mono text-xs">{v.sku}</td>
                  <td className={`tabular-nums font-medium ${v.stock === 0 ? "text-danger" : v.stock <= v.threshold ? "text-terre-ink" : ""}`}>{v.stock}</td>
                  <td className="tabular-nums text-ink-soft" title="En attente de paiement">{v.reserved || "—"}</td>
                  <td>
                    <ActionForm action={adjustStock} resetOnSuccess className="flex flex-wrap items-center gap-1.5">
                      <input type="hidden" name="variantId" value={v.id} />
                      <select name="mode" className={`${inputCls} !w-auto !py-1`} aria-label="Type d'ajustement">
                        <option value="add">+/−</option>
                        <option value="set">Fixer à</option>
                      </select>
                      <input name="quantity" type="number" required className={`${inputCls} !w-20 !py-1`} aria-label="Quantité" />
                      <select name="reason" className={`${inputCls} !w-auto !py-1`} aria-label="Motif">
                        <option value="restock">Réassort</option>
                        <option value="manual">Correction</option>
                        <option value="return">Retour</option>
                      </select>
                      <input name="note" placeholder="Note" className={`${inputCls} !w-32 !py-1`} aria-label="Note" />
                      <Submit className="rounded bg-ink px-3 py-1 text-sm text-paper" pendingLabel="…">OK</Submit>
                    </ActionForm>
                  </td>
                  <td><Link href={`?variante=${v.id}#historique`} className="text-xs underline">Historique</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card title={f.variante ? `Historique de ${history[0]?.variant.sku ?? "la variante"}` : "Derniers mouvements"} className="mt-8">
        <div id="historique" className="overflow-x-auto">
          {history.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucun mouvement.</p>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Date</th><th>SKU</th><th>Motif</th><th>Variation</th><th>Après</th><th>Note</th></tr></thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap text-ink-soft">{dateTimeFr(m.createdAt)}</td>
                    <td className="font-mono text-xs">{m.variant.sku}</td>
                    <td>{reasonLabels[m.reason] ?? m.reason}{m.orderId && <> · <Link href={`/admin/commandes/${m.orderId}`} className="underline">commande</Link></>}</td>
                    <td className={`tabular-nums ${m.delta < 0 ? "text-danger" : "text-sapin"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                    <td className="tabular-nums">{m.stockAfter}</td>
                    <td className="text-ink-soft">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </>
  );
}
