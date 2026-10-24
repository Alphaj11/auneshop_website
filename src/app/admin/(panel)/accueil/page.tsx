import { db } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { PageHeader, btnSm, inputCls, labelCls } from "@/components/admin/ui";
import { publishHomepage, saveSectionDraft } from "@/app/admin/actions/homepage";
import { requireStaffPage } from "@/lib/auth/guards";

export const metadata = { title: "Page d'accueil" };

const sectionInfo: Record<string, { label: string; fields: string[]; help?: string }> = {
  hero: { label: "Bandeau principal", fields: ["title", "subtitle", "image", "cta"] },
  promo_banner: { label: "Bandeau défilant", fields: ["title", "ctaHref"], help: "Le titre est le texte qui défile." },
  featured_collection: { label: "Collection à la une", fields: ["subtitle", "title", "body", "ctaLabel", "collection"], help: "Le sous-titre sert de surtitre." },
  featured_products: { label: "Produits à la une", fields: ["title", "subtitle", "products"], help: "Sans sélection, les produits cochés « À la une » sont affichés." },
  story: { label: "Histoire du vêtement", fields: ["title", "subtitle", "body"] },
  collections: { label: "Liste des collections", fields: ["title", "subtitle"] },
  selection: { label: "La sélection Aune", fields: ["title", "subtitle", "mode", "products"] },
  newsletter: { label: "Newsletter", fields: ["title", "subtitle"], help: "Le texte de consentement se règle dans Réglages > Newsletter." },
};

export default async function HomepageEditor() {
  await requireStaffPage("content.manage");
  const [sections, collections, products] = await Promise.all([
    db.query.homepageSections.findMany(),
    db.query.collections.findMany({ columns: { id: true, name: true, status: true }, orderBy: (t, { asc }) => [asc(t.position)] }),
    db.query.products.findMany({ where: (t, { eq }) => eq(t.status, "active"), columns: { id: true, name: true }, orderBy: (t, { asc }) => [asc(t.name)] }),
  ]);
  sections.sort((a, b) => a.draft.position - b.draft.position);
  const dirty = sections.some((s) => JSON.stringify(s.draft) !== JSON.stringify(s.published));

  return (
    <>
      <PageHeader
        title="Page d'accueil"
        description="Les modifications sont enregistrées en brouillon. Le public ne les voit qu'après publication."
        actions={
          <>
            <a href="/?apercu=1" target="_blank" className={btnSm}>Aperçu du brouillon ↗</a>
            <ActionForm action={publishHomepage} confirm="Annuler toutes les modifications non publiées ?">
              <Submit className={btnSm} name="op" value="discard" pendingLabel="…">Annuler le brouillon</Submit>
            </ActionForm>
            <ActionForm action={publishHomepage}>
              <Submit className="rounded bg-ink px-4 py-2 text-sm text-paper hover:bg-terre" name="op" value="publish" pendingLabel="Publication…">Publier</Submit>
            </ActionForm>
          </>
        }
      />
      {dirty && <p className="mb-6 rounded border border-vanille bg-vanille/40 px-4 py-3 text-sm">Des modifications ne sont pas encore publiées.</p>}
      <div className="space-y-4">
        {sections.map((s) => {
          const info = sectionInfo[s.type] ?? { label: s.type, fields: ["title"] };
          const d = s.draft;
          const changed = JSON.stringify(s.draft) !== JSON.stringify(s.published);
          const has = (f: string) => info.fields.includes(f);
          return (
            <details key={s.id} className="group rounded-lg border border-line bg-white/70" open={changed}>
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
                <span className="flex items-center gap-3">
                  <span className="w-6 text-xs tabular-nums text-ink-mute">{d.position}</span>
                  <span className="font-medium">{info.label}</span>
                  {!d.enabled && <span className="rounded bg-line px-2 py-0.5 text-xs">Masquée</span>}
                  {changed && <span className="rounded bg-vanille/70 px-2 py-0.5 text-xs">Modifiée</span>}
                </span>
                <span className="truncate text-sm text-ink-soft">{d.title}</span>
              </summary>
              <ActionForm action={saveSectionDraft} className="grid gap-4 border-t border-line p-5 md:grid-cols-2">
                <input type="hidden" name="id" value={s.id} />
                {info.help && <p className="text-sm text-ink-soft md:col-span-2">{info.help}</p>}
                <div className="flex items-center gap-6 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={d.enabled} className="h-4 w-4" /> Afficher la section</label>
                  <label className="flex items-center gap-2 text-sm">Ordre <input name="position" type="number" min={0} max={99} defaultValue={d.position} className={`${inputCls} !w-20`} /></label>
                </div>
                {has("title") && (
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor={`t-${s.id}`}>{s.type === "promo_banner" ? "Texte" : "Titre"}</label>
                    <input id={`t-${s.id}`} name="title" defaultValue={d.title} className={inputCls} />
                  </div>
                )}
                {has("subtitle") && (
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor={`st-${s.id}`}>{s.type === "featured_collection" ? "Surtitre" : "Sous-titre"}</label>
                    <input id={`st-${s.id}`} name="subtitle" defaultValue={d.subtitle} className={inputCls} />
                  </div>
                )}
                {has("body") && (
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor={`b-${s.id}`}>Texte</label>
                    <textarea id={`b-${s.id}`} name="body" rows={4} defaultValue={d.body} className={inputCls} />
                  </div>
                )}
                {(has("cta") || has("ctaLabel")) && (
                  <div>
                    <label className={labelCls} htmlFor={`cl-${s.id}`}>Texte du bouton</label>
                    <input id={`cl-${s.id}`} name="ctaLabel" defaultValue={d.ctaLabel} className={inputCls} />
                  </div>
                )}
                {(has("cta") || has("ctaHref")) && (
                  <div>
                    <label className={labelCls} htmlFor={`ch-${s.id}`}>Lien (/boutique ou https://…)</label>
                    <input id={`ch-${s.id}`} name="ctaHref" defaultValue={d.ctaHref} className={inputCls} />
                  </div>
                )}
                {has("image") && (
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor={`i-${s.id}`}>Image (JPEG, PNG, WebP, AVIF)</label>
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {d.imageUrl && <img src={d.imageUrl} alt="" className="h-16 w-28 rounded object-cover" />}
                      <input id={`i-${s.id}`} name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" />
                    </div>
                  </div>
                )}
                {has("collection") && (
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor={`c-${s.id}`}>Collection</label>
                    <select id={`c-${s.id}`} name="collectionId" defaultValue={d.collectionId ?? ""} className={inputCls}>
                      <option value="">Aucune (section masquée)</option>
                      {collections.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status === "draft" ? " (brouillon : non affichée)" : ""}</option>)}
                    </select>
                  </div>
                )}
                {has("mode") && (
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor={`m-${s.id}`}>Contenu</label>
                    <select id={`m-${s.id}`} name="mode" defaultValue={d.mode ?? "new"} className={inputCls}>
                      <option value="new">Nouveautés</option>
                      <option value="featured">Produits à la une</option>
                      <option value="popular">Les plus vendus (commandes réelles)</option>
                      <option value="manual">Sélection manuelle ci-dessous</option>
                    </select>
                  </div>
                )}
                {has("products") && (
                  <fieldset className="md:col-span-2">
                    <legend className={labelCls}>Produits choisis (12 max.)</legend>
                    <input type="hidden" name="productIdsPresent" value="1" />
                    <div className="grid max-h-56 gap-1 overflow-y-auto rounded border border-line bg-white p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      {products.map((p) => (
                        <label key={p.id} className="flex items-center gap-2">
                          <input type="checkbox" name="productIds" value={p.id} defaultChecked={d.productIds?.includes(p.id)} className="h-4 w-4" /> {p.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                <div className="md:col-span-2">
                  <Submit className="rounded bg-ink px-4 py-2 text-sm text-paper">Enregistrer le brouillon</Submit>
                </div>
              </ActionForm>
            </details>
          );
        })}
      </div>
    </>
  );
}
