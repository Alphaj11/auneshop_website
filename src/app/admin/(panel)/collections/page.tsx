import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { Empty, PageHeader } from "@/components/admin/ui";
import { requireStaffPage } from "@/lib/auth/guards";

export const metadata = { title: "Collections" };

export default async function CollectionsAdmin() {
  await requireStaffPage("collections.manage");
  const [rows, featured] = await Promise.all([
    db
      .select({
        id: schema.collections.id,
        name: schema.collections.name,
        slug: schema.collections.slug,
        status: schema.collections.status,
        displayMode: schema.collections.displayMode,
        immersiveEnabled: schema.collections.immersiveEnabled,
        coverImageUrl: schema.collections.coverImageUrl,
        isDemo: schema.collections.isDemo,
        count: sql<number>`(select count(*)::int from ${schema.collectionProducts} cp where cp.collection_id = ${schema.collections.id})`,
      })
      .from(schema.collections)
      .orderBy(schema.collections.position, schema.collections.name),
    db.query.homepageSections.findFirst({ where: (t, { eq }) => eq(t.type, "featured_collection") }),
  ]);
  const featuredId = featured?.published.collectionId;

  return (
    <>
      <PageHeader title="Collections" description={`${rows.length} collection(s)`} actions={<Link href="/admin/collections/nouvelle" className="rounded bg-ink px-4 py-2 text-sm text-paper hover:bg-terre">Nouvelle collection</Link>} />
      {rows.length === 0 ? (
        <Empty title="Aucune collection" action={<Link href="/admin/collections/nouvelle" className="underline">Créer une collection</Link>} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/collections/${c.id}`} className="block overflow-hidden rounded-lg border border-line bg-white/70 transition hover:border-ink">
                <div className="aspect-[16/9] bg-paper-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.coverImageUrl && <img src={c.coverImageUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="p-4">
                  <p className="font-display text-xl">{c.name}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {c.status === "published" ? "Publiée" : "Brouillon"} · {c.count} produit(s) · {c.displayMode === "immersive" && c.immersiveEnabled ? "Immersive" : "Grille"}
                    {c.id === featuredId && " · À la une de l'accueil"}
                    {c.isDemo && " · Exemple"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
