import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { ProductForm } from "@/components/admin/ProductForm";
import { VariantsEditor } from "@/components/admin/VariantsEditor";
import { Card, PageHeader, btnDangerSm, btnSm, inputCls, labelCls } from "@/components/admin/ui";
import { bulkProducts, duplicateProduct, setProductCollections, updateProductImage, uploadProductImages } from "@/app/admin/actions/products";
import { requireStaffPage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { centsToInput } from "@/lib/money";

export const metadata = { title: "Modifier un produit" };

const kindLabels = { gallery: "Galerie", cutout: "Détouré (scène)", worn: "Porté (mannequin)" } as const;

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string; copie?: string }> }) {
  const user = await requireStaffPage("products.manage");
  const { id } = await params;
  const sp = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [product, categories, collections] = await Promise.all([
    db.query.products.findFirst({
      where: eq(schema.products.id, id),
      with: {
        variants: { orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)] },
        images: { orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)] },
        collections: true,
      },
    }),
    db.query.categories.findMany({ orderBy: (t, { asc }) => [asc(t.position), asc(t.name)] }),
    db.query.collections.findMany({ orderBy: (t, { asc }) => [asc(t.position)] }),
  ]);
  if (!product) notFound();
  const colors = [...new Set(product.variants.map((v) => v.color))];
  const variantsKey = product.variants.map((v) => `${v.id}:${v.updatedAt.getTime()}`).join("|");

  return (
    <>
      <PageHeader
        title={product.name}
        back={{ href: "/admin/produits", label: "Produits" }}
        description={product.isDemo ? "Fiche d'exemple : remplacez textes et visuels par les vôtres avant la mise en production." : undefined}
        actions={
          <>
            {product.status === "active" && <Link href={`/produits/${product.slug}`} target="_blank" className={btnSm}>Voir sur la boutique ↗</Link>}
            <ActionForm action={duplicateProduct}>
              <input type="hidden" name="id" value={product.id} />
              <Submit className={btnSm} pendingLabel="Copie…">Dupliquer</Submit>
            </ActionForm>
            {product.status !== "archived" && (
              <ActionForm action={bulkProducts} confirm="Archiver ce produit ? Il disparaîtra de la boutique, l'historique des commandes est conservé.">
                <input type="hidden" name="ids" value={product.id} />
                <input type="hidden" name="op" value="archived" />
                <Submit className={btnDangerSm} pendingLabel="…">Archiver</Submit>
              </ActionForm>
            )}
          </>
        }
      />
      {(sp.cree || sp.copie) && (
        <p className="mb-6 rounded border border-sapin/30 bg-sapin/10 px-4 py-3 text-sm">
          {sp.cree ? "Produit créé en brouillon." : "Copie créée en brouillon (stock à zéro)."} Ajoutez les variantes et les images, puis passez-le « En ligne ».
        </p>
      )}

      <ProductForm product={product} categories={categories} />

      <div className="mt-8 space-y-8">
        <Card title={`Variantes (${product.variants.length})`}>
          <VariantsEditor
            version={variantsKey}
            productId={product.id}
            // Préfixe lisible + fragment de l'identifiant pour éviter les doublons entre produits proches.
            skuPrefix={`${product.slug.split("-").map((s) => s.slice(0, 3)).join("").toUpperCase().slice(0, 6) || "AU"}${product.id.slice(0, 3).toUpperCase()}`}
            initial={product.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? "",
              price: v.priceCents != null ? centsToInput(v.priceCents) : "",
              stock: v.stock,
              trackInventory: v.trackInventory,
              lowStockThreshold: v.lowStockThreshold,
              isActive: v.isActive,
            }))}
          />
        </Card>

        <Card title={`Images (${product.images.length})`}>
          <p className="mb-4 text-sm text-ink-soft">
            <strong>Galerie</strong> : photos de la fiche produit. <strong>Détouré</strong> : vêtement seul sur fond transparent, utilisé dans la scène orbitale.{" "}
            <strong>Porté</strong> : le mannequin portant la pièce, affiché quand on la sélectionne. Associez une couleur pour que le visuel change avec la variante.
          </p>
          <ActionForm action={uploadProductImages} resetOnSuccess className="mb-6 grid gap-3 rounded border border-dashed border-line p-4 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="productId" value={product.id} />
            <div className="lg:col-span-2">
              <label htmlFor="files" className={labelCls}>Fichiers (JPEG, PNG, WebP, AVIF, 8 Mo max.)</label>
              <input id="files" name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full text-sm" />
            </div>
            <div>
              <label htmlFor="kind" className={labelCls}>Type</label>
              <select id="kind" name="kind" className={inputCls}>
                {Object.entries(kindLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="color" className={labelCls}>Couleur</label>
              <select id="color" name="color" className={inputCls}>
                <option value="">Toutes</option>
                {colors.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Submit className="w-full rounded bg-ink px-4 py-2 text-sm text-paper" pendingLabel="Envoi…">Téléverser</Submit>
            </div>
            <div className="sm:col-span-2 lg:col-span-5">
              <label htmlFor="alt" className={labelCls}>Texte alternatif (décrit l&apos;image pour les lecteurs d&apos;écran)</label>
              <input id="alt" name="alt" className={inputCls} placeholder={`${product.name} porté de face, coloris…`} />
            </div>
          </ActionForm>
          {product.images.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune image.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {product.images.map((img, i) => (
                <li key={img.id} className="flex gap-3 rounded border border-line bg-white p-3">
                  <div className="h-32 w-24 shrink-0 overflow-hidden rounded bg-paper-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-contain" />
                  </div>
                  <ActionForm action={updateProductImage} className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
                    <input type="hidden" name="imageId" value={img.id} />
                    <input name="alt" defaultValue={img.alt} className={`${inputCls} !py-1`} aria-label="Texte alternatif" />
                    <div className="flex gap-2">
                      <select name="kind" defaultValue={img.kind} className={`${inputCls} !py-1`} aria-label="Type">
                        {Object.entries(kindLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <select name="color" defaultValue={img.color ?? ""} className={`${inputCls} !py-1`} aria-label="Couleur">
                        <option value="">Toutes</option>
                        {[...new Set([...colors, ...(img.color ? [img.color] : [])])].map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      <Submit className={btnSm} name="op" value="save" pendingLabel="…">OK</Submit>
                      <Submit className={btnSm} name="op" value="up" pendingLabel="…"><span aria-label="Monter">↑</span></Submit>
                      <Submit className={btnSm} name="op" value="down" pendingLabel="…"><span aria-label="Descendre">↓</span></Submit>
                      <Submit className={btnDangerSm} name="op" value="delete" pendingLabel="…">Supprimer</Submit>
                      {i === 0 && <span className="self-center text-xs text-ink-mute">Principale</span>}
                    </div>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {can(user.role, "collections.manage") && (
          <Card title="Collections">
            <ActionForm action={setProductCollections} className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <input type="hidden" name="productId" value={product.id} />
              {collections.map((c) => (
                <label key={c.id} className="flex items-center gap-2">
                  <input type="checkbox" name="collectionIds" value={c.id} defaultChecked={product.collections.some((pc) => pc.collectionId === c.id)} className="h-4 w-4" />
                  {c.name} {c.status === "draft" && <span className="text-xs text-ink-mute">(brouillon)</span>}
                </label>
              ))}
              <Submit className={btnSm}>Enregistrer</Submit>
            </ActionForm>
          </Card>
        )}

        {product.status === "archived" && (
          <Card title="Zone sensible">
            <ActionForm action={bulkProducts} confirm="Supprimer définitivement ce produit, ses variantes et ses images ?" className="flex items-center justify-between gap-4 text-sm">
              <input type="hidden" name="ids" value={product.id} />
              <input type="hidden" name="op" value="delete" />
              <p className="text-ink-soft">La suppression n&apos;est possible que pour un produit jamais commandé. Sinon, gardez-le archivé.</p>
              <Submit className={btnDangerSm}>Supprimer définitivement</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
