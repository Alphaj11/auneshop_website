"use client";

import { ActionForm, FieldError, Submit } from "./ActionForm";
import { inputCls, labelCls } from "./ui";
import { saveProduct } from "@/app/admin/actions/products";
import { centsToInput } from "@/lib/money";

type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string | null;
  status: "draft" | "active" | "archived";
  priceCents: number;
  compareAtPriceCents: number | null;
  isFeatured: boolean;
  isNew: boolean;
  isPreorder: boolean;
  isDemo: boolean;
  materials: string;
  care: string;
  sizeGuide: string;
  craftStory: string;
  shippingNote: string;
  weightGrams: number;
  seoTitle: string | null;
  seoDescription: string | null;
};

export function ProductForm({ product, categories }: { product?: Product; categories: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveProduct} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {(state) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            {product && <input type="hidden" name="id" value={product.id} />}
            <div className="space-y-6">
              <section className="space-y-4 rounded-lg border border-line bg-white/70 p-5">
                <div>
                  <label htmlFor="name" className={labelCls}>Nom *</label>
                  <input id="name" name="name" required defaultValue={product?.name} className={inputCls} />
                  <FieldError error={e.name} />
                </div>
                <div>
                  <label htmlFor="slug" className={labelCls}>Adresse de la page (laisser vide pour la générer)</label>
                  <div className="flex items-center gap-1 text-sm text-ink-mute">/produits/<input id="slug" name="slug" defaultValue={product?.slug} className={inputCls} /></div>
                  <FieldError error={e.slug} />
                </div>
                <div>
                  <label htmlFor="shortDescription" className={labelCls}>Accroche (cartes et haut de fiche)</label>
                  <input id="shortDescription" name="shortDescription" maxLength={300} defaultValue={product?.shortDescription} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="description" className={labelCls}>Description</label>
                  <textarea id="description" name="description" rows={7} defaultValue={product?.description} className={inputCls} />
                </div>
              </section>

              <section className="grid gap-4 rounded-lg border border-line bg-white/70 p-5 sm:grid-cols-2">
                <h2 className="text-sm font-medium sm:col-span-2">Informations produit</h2>
                <p className="-mt-2 text-xs text-ink-soft sm:col-span-2">
                  N&apos;indiquez que des informations vérifiées (matière, fabrication, labels). Laissez vide en cas de doute : le champ n&apos;apparaîtra pas sur la fiche.
                </p>
                <div>
                  <label htmlFor="materials" className={labelCls}>Matière et composition</label>
                  <textarea id="materials" name="materials" rows={3} defaultValue={product?.materials} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="care" className={labelCls}>Entretien</label>
                  <textarea id="care" name="care" rows={3} defaultValue={product?.care} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="sizeGuide" className={labelCls}>Guide des tailles et coupe</label>
                  <textarea id="sizeGuide" name="sizeGuide" rows={3} defaultValue={product?.sizeGuide} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="craftStory" className={labelCls}>Fabrication</label>
                  <textarea id="craftStory" name="craftStory" rows={3} defaultValue={product?.craftStory} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="shippingNote" className={labelCls}>Note de livraison spécifique</label>
                  <input id="shippingNote" name="shippingNote" defaultValue={product?.shippingNote} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="weightGrams" className={labelCls}>Poids (grammes)</label>
                  <input id="weightGrams" name="weightGrams" type="number" min={0} defaultValue={product?.weightGrams ?? 0} className={inputCls} />
                </div>
              </section>

              <section className="grid gap-4 rounded-lg border border-line bg-white/70 p-5">
                <h2 className="text-sm font-medium">Référencement</h2>
                <div>
                  <label htmlFor="seoTitle" className={labelCls}>Titre SEO (70 caractères max., sinon le nom)</label>
                  <input id="seoTitle" name="seoTitle" maxLength={70} defaultValue={product?.seoTitle ?? ""} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="seoDescription" className={labelCls}>Description SEO (170 caractères max.)</label>
                  <textarea id="seoDescription" name="seoDescription" maxLength={170} rows={2} defaultValue={product?.seoDescription ?? ""} className={inputCls} />
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="space-y-4 rounded-lg border border-line bg-white/70 p-5">
                <div>
                  <label htmlFor="status" className={labelCls}>Statut</label>
                  <select id="status" name="status" defaultValue={product?.status ?? "draft"} className={inputCls}>
                    <option value="draft">Brouillon (invisible)</option>
                    <option value="active">En ligne</option>
                    <option value="archived">Archivé (invisible, historique conservé)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="categoryId" className={labelCls}>Catégorie</label>
                  <select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ""} className={inputCls}>
                    <option value="">Aucune</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="price" className={labelCls}>Prix TTC (€) *</label>
                    <input id="price" name="price" inputMode="decimal" defaultValue={product ? centsToInput(product.priceCents) : ""} className={inputCls} />
                    <FieldError error={e.price} />
                  </div>
                  <div>
                    <label htmlFor="compareAt" className={labelCls}>Ancien prix (€)</label>
                    <input id="compareAt" name="compareAt" inputMode="decimal" defaultValue={product?.compareAtPriceCents ? centsToInput(product.compareAtPriceCents) : ""} className={inputCls} />
                    <FieldError error={e.compareAt} />
                  </div>
                </div>
                <fieldset className="space-y-2 text-sm">
                  {[
                    ["isFeatured", "À la une (accueil)", product?.isFeatured],
                    ["isNew", "Badge « Nouveau »", product?.isNew],
                    ["isPreorder", "Précommande / fabriqué à la commande", product?.isPreorder],
                    ["isDemo", "Donnée d'exemple (badge « Exemple » visible)", product ? product.isDemo : false],
                  ].map(([name, label, checked]) => (
                    <label key={name as string} className="flex items-center gap-2">
                      <input type="checkbox" name={name as string} defaultChecked={!!checked} className="h-4 w-4" /> {label}
                    </label>
                  ))}
                </fieldset>
                <Submit className="w-full rounded bg-ink px-4 py-2.5 text-sm text-paper hover:bg-terre">{product ? "Enregistrer le produit" : "Créer le produit"}</Submit>
              </section>
            </aside>
          </>
        );
      }}
    </ActionForm>
  );
}
