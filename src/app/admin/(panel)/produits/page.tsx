import Link from "next/link";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm } from "@/components/admin/ActionForm";
import { BulkBar } from "@/components/admin/BulkBar";
import { Empty, PageHeader, btnSm, inputCls } from "@/components/admin/ui";
import { bulkProducts } from "@/app/admin/actions/products";
import { requireStaffPage } from "@/lib/auth/guards";
import { formatPrice } from "@/lib/money";

export const metadata = { title: "Produits" };

const statusLabels = { active: "En ligne", draft: "Brouillon", archived: "Archivé" } as const;
const statusTone = { active: "bg-sapin/15 text-sapin", draft: "bg-vanille/60 text-ink", archived: "bg-line text-ink-soft" } as const;

type F = { q?: string; statut?: string; categorie?: string; stock?: string; tri?: string };

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<F> }) {
  await requireStaffPage("products.manage");
  const f = await searchParams;
  const conds: SQL[] = [];
  if (f.q) {
    const like = `%${f.q.trim()}%`;
    conds.push(
      or(
        ilike(schema.products.name, like),
        ilike(schema.products.slug, like),
        sql`exists (select 1 from ${schema.productVariants} v where v.product_id = ${schema.products.id} and v.sku ilike ${like})`,
      )!,
    );
  }
  if (f.statut && f.statut in statusLabels) conds.push(eq(schema.products.status, f.statut as keyof typeof statusLabels));
  if (f.categorie) conds.push(eq(schema.products.categoryId, f.categorie));
  if (f.stock === "bas")
    conds.push(sql`exists (select 1 from ${schema.productVariants} v where v.product_id = ${schema.products.id} and v.track_inventory and v.is_active and v.stock <= v.low_stock_threshold)`);

  const order =
    f.tri === "nom" ? [asc(schema.products.name)] : f.tri === "prix" ? [desc(schema.products.priceCents)] : [desc(schema.products.updatedAt)];
  const [rows, categories] = await Promise.all([
    db.query.products.findMany({
      where: conds.length ? and(...conds) : undefined,
      orderBy: order,
      with: { variants: true, category: true, images: { orderBy: (t, { asc }) => [asc(t.position)], limit: 1 } },
      limit: 300,
    }),
    db.query.categories.findMany({ orderBy: (t, { asc }) => [asc(t.position), asc(t.name)] }),
  ]);

  return (
    <>
      <PageHeader
        title="Produits"
        description={`${rows.length} produit(s)`}
        actions={
          <>
            <Link href="/admin/produits/categories" className={btnSm}>Catégories</Link>
            <Link href="/admin/produits/nouveau" className="rounded bg-ink px-4 py-2 text-sm text-paper hover:bg-terre">Nouveau produit</Link>
          </>
        }
      />
      <form className="mb-6 grid gap-3 rounded-lg border border-line bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input name="q" defaultValue={f.q} placeholder="Nom, adresse ou SKU" className={`${inputCls} lg:col-span-2`} aria-label="Recherche" />
        <select name="statut" defaultValue={f.statut ?? ""} className={inputCls} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="categorie" defaultValue={f.categorie ?? ""} className={inputCls} aria-label="Catégorie">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="stock" defaultValue={f.stock ?? ""} className={inputCls} aria-label="Stock">
          <option value="">Tous les stocks</option>
          <option value="bas">Stock bas ou épuisé</option>
        </select>
        <div className="flex gap-2">
          <select name="tri" defaultValue={f.tri ?? ""} className={inputCls} aria-label="Tri">
            <option value="">Modifiés récemment</option>
            <option value="nom">Nom</option>
            <option value="prix">Prix décroissant</option>
          </select>
          <button className="rounded bg-ink px-4 text-sm text-paper">Filtrer</button>
        </div>
      </form>

      {rows.length === 0 ? (
        <Empty title="Aucun produit" text="Aucun produit ne correspond à ces filtres." action={<Link href="/admin/produits/nouveau" className="underline">Créer un produit</Link>} />
      ) : (
        <ActionForm action={bulkProducts} className="overflow-hidden rounded-lg border border-line bg-white/70">
          <BulkBar
            ops={[
              { value: "active", label: "Mettre en ligne" },
              { value: "draft", label: "Repasser en brouillon" },
              { value: "archived", label: "Archiver" },
              { value: "feature", label: "Mettre à la une" },
              { value: "unfeature", label: "Retirer de la une" },
              { value: "new", label: "Marquer « Nouveau »" },
              { value: "unnew", label: "Retirer « Nouveau »" },
              { value: "price", label: "Modifier les prix (%)" },
              { value: "delete", label: "Supprimer définitivement", danger: true },
            ]}
          />
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr><th className="w-8"><span className="sr-only">Sélection</span></th><th>Produit</th><th>Statut</th><th>Catégorie</th><th>Stock</th><th className="text-right">Prix</th></tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const tracked = p.variants.filter((v) => v.trackInventory && v.isActive);
                  const stock = tracked.reduce((n, v) => n + v.stock, 0);
                  const low = tracked.filter((v) => v.stock <= v.lowStockThreshold).length;
                  return (
                    <tr key={p.id}>
                      <td><input type="checkbox" name="ids" value={p.id} className="h-4 w-4" aria-label={`Sélectionner ${p.name}`} /></td>
                      <td>
                        <Link href={`/admin/produits/${p.id}`} className="flex items-center gap-3 hover:underline">
                          <span className="h-12 w-10 shrink-0 overflow-hidden rounded bg-paper-2">
                            {p.images[0] && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                            )}
                          </span>
                          <span>
                            <span className="font-medium">{p.name}</span>
                            <span className="block text-xs text-ink-mute">
                              {p.variants.length} variante(s)
                              {p.isFeatured && " · À la une"}
                              {p.isNew && " · Nouveau"}
                              {p.isDemo && " · Exemple"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td><span className={`rounded px-2 py-0.5 text-xs ${statusTone[p.status]}`}>{statusLabels[p.status]}</span></td>
                      <td className="text-ink-soft">{p.category?.name ?? "—"}</td>
                      <td className="tabular-nums">
                        {p.isPreorder || !tracked.length ? <span className="text-ink-soft">À la commande</span> : <>{stock}{low > 0 && <span className="ml-2 text-xs text-danger">{low} bas</span>}</>}
                      </td>
                      <td className="text-right tabular-nums">{formatPrice(p.priceCents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ActionForm>
      )}
    </>
  );
}
