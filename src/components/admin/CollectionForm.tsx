"use client";

import { ActionForm, FieldError, Submit } from "./ActionForm";
import { inputCls, labelCls } from "./ui";
import { saveCollection } from "@/app/admin/actions/collections";

type C = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  accentColor: string;
  status: "draft" | "published";
  displayMode: "immersive" | "grid";
  immersiveEnabled: boolean;
  position: number;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isDemo: boolean;
};

export function CollectionForm({ collection }: { collection?: C }) {
  return (
    <ActionForm action={saveCollection} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {(state) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            {collection && <input type="hidden" name="id" value={collection.id} />}
            <section className="space-y-4 rounded-lg border border-line bg-white/70 p-5">
              <div>
                <label htmlFor="name" className={labelCls}>Nom *</label>
                <input id="name" name="name" required defaultValue={collection?.name} className={inputCls} />
                <FieldError error={e.name} />
              </div>
              <div>
                <label htmlFor="slug" className={labelCls}>Adresse (vide = générée)</label>
                <div className="flex items-center gap-1 text-sm text-ink-mute">/collections/<input id="slug" name="slug" defaultValue={collection?.slug} className={inputCls} /></div>
              </div>
              <div>
                <label htmlFor="tagline" className={labelCls}>Accroche</label>
                <input id="tagline" name="tagline" maxLength={160} defaultValue={collection?.tagline} className={inputCls} />
              </div>
              <div>
                <label htmlFor="description" className={labelCls}>Description</label>
                <textarea id="description" name="description" rows={5} defaultValue={collection?.description} className={inputCls} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="seoTitle" className={labelCls}>Titre SEO</label>
                  <input id="seoTitle" name="seoTitle" maxLength={70} defaultValue={collection?.seoTitle ?? ""} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="seoDescription" className={labelCls}>Description SEO</label>
                  <input id="seoDescription" name="seoDescription" maxLength={170} defaultValue={collection?.seoDescription ?? ""} className={inputCls} />
                </div>
              </div>
              <div>
                <label htmlFor="cover" className={labelCls}>Image de couverture (JPEG, PNG, WebP, AVIF)</label>
                <div className="flex items-center gap-4">
                  {collection?.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={collection.coverImageUrl} alt="" className="h-20 w-28 rounded object-cover" />
                  )}
                  <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" />
                  {collection?.coverImageUrl && (
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeCover" className="h-4 w-4" /> Retirer</label>
                  )}
                </div>
              </div>
            </section>
            <aside className="space-y-4 rounded-lg border border-line bg-white/70 p-5">
              <div>
                <label htmlFor="status" className={labelCls}>Statut</label>
                <select id="status" name="status" defaultValue={collection?.status ?? "draft"} className={inputCls}>
                  <option value="draft">Brouillon (invisible)</option>
                  <option value="published">Publiée</option>
                </select>
              </div>
              <div>
                <label htmlFor="displayMode" className={labelCls}>Affichage par défaut</label>
                <select id="displayMode" name="displayMode" defaultValue={collection?.displayMode ?? "immersive"} className={inputCls}>
                  <option value="immersive">Scène immersive</option>
                  <option value="grid">Grille classique</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="immersiveEnabled" defaultChecked={collection?.immersiveEnabled ?? true} className="h-4 w-4" /> Proposer la scène immersive
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="accentColor" className={labelCls}>Couleur d&apos;ambiance</label>
                  <input id="accentColor" name="accentColor" type="color" defaultValue={collection?.accentColor ?? "#b5562f"} className="h-10 w-full cursor-pointer rounded border border-line" />
                </div>
                <div>
                  <label htmlFor="position" className={labelCls}>Ordre</label>
                  <input id="position" name="position" type="number" min={0} defaultValue={collection?.position ?? 0} className={inputCls} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isDemo" defaultChecked={collection?.isDemo ?? false} className="h-4 w-4" /> Donnée d&apos;exemple
              </label>
              <Submit className="w-full rounded bg-ink px-4 py-2.5 text-sm text-paper hover:bg-terre">{collection ? "Enregistrer" : "Créer la collection"}</Submit>
            </aside>
          </>
        );
      }}
    </ActionForm>
  );
}
