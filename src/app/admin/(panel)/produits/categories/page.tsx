import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Card, PageHeader, btnDangerSm, btnSm, inputCls } from "@/components/admin/ui";
import { saveCategory } from "@/app/admin/actions/products";
import { requireStaffPage } from "@/lib/auth/guards";

export const metadata = { title: "Catégories" };

const departments = { femme: "Femme", homme: "Homme", mixte: "Mixte / accessoires" };

export default async function Categories() {
  await requireStaffPage("products.manage");
  const rows = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      department: schema.categories.department,
      position: schema.categories.position,
      count: sql<number>`(select count(*)::int from ${schema.products} p where p.category_id = ${schema.categories.id})`,
    })
    .from(schema.categories)
    .orderBy(schema.categories.position, schema.categories.name);

  const fields = (c?: (typeof rows)[number]) => (
    <>
      <input name="name" defaultValue={c?.name} required placeholder="Nom" className={inputCls} aria-label="Nom" />
      <select name="department" defaultValue={c?.department ?? "femme"} className={inputCls} aria-label="Rayon">
        {Object.entries(departments).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input name="position" type="number" min={0} defaultValue={c?.position ?? rows.length} className={inputCls} aria-label="Ordre" />
    </>
  );

  return (
    <>
      <PageHeader title="Catégories" back={{ href: "/admin/produits", label: "Produits" }} description="Le rayon détermine l'emplacement dans le menu de la boutique." />
      <Card title="Ajouter">
        <ActionForm action={saveCategory} resetOnSuccess className="grid gap-3 sm:grid-cols-[2fr_1fr_100px_auto]">
          {fields()}
          <Submit className="rounded bg-ink px-4 py-2 text-sm text-paper">Ajouter</Submit>
        </ActionForm>
      </Card>
      <div className="mt-6 space-y-2">
        {rows.map((c) => (
          <ActionForm key={c.id} action={saveCategory} confirm={undefined} className="grid items-center gap-3 rounded-lg border border-line bg-white/70 p-3 sm:grid-cols-[2fr_1fr_100px_auto_auto]">
            <input type="hidden" name="id" value={c.id} />
            {fields(c)}
            <Submit className={btnSm} name="op" value="save">Enregistrer</Submit>
            <Submit className={btnDangerSm} name="op" value="delete">Supprimer ({c.count})</Submit>
          </ActionForm>
        ))}
      </div>
    </>
  );
}
