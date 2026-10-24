import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { CollectionProductsEditor } from "@/components/admin/CollectionProductsEditor";
import { Card, PageHeader, btnDangerSm, btnSm } from "@/components/admin/ui";
import { deleteCollection, featureCollectionOnHome } from "@/app/admin/actions/collections";
import { requireStaffPage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";

export const metadata = { title: "Modifier une collection" };

export default async function EditCollection({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage("collections.manage");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [collection, products, featured] = await Promise.all([
    db.query.collections.findFirst({ where: eq(schema.collections.id, id), with: { products: { orderBy: (t, { asc }) => [asc(t.position)] } } }),
    db.query.products.findMany({
      where: (t, { ne }) => ne(t.status, "archived"),
      orderBy: (t, { asc }) => [asc(t.name)],
      columns: { id: true, name: true, status: true, priceCents: true },
      with: { images: { orderBy: (t, { asc }) => [asc(t.position)], limit: 1, columns: { url: true } } },
    }),
    db.query.homepageSections.findFirst({ where: (t, { eq }) => eq(t.type, "featured_collection") }),
  ]);
  if (!collection) notFound();
  const isFeatured = featured?.published.collectionId === collection.id;

  return (
    <>
      <PageHeader
        title={collection.name}
        back={{ href: "/admin/collections", label: "Collections" }}
        actions={
          <>
            {collection.status === "published" && <Link href={`/collections/${collection.slug}`} target="_blank" className={btnSm}>Voir ↗</Link>}
            {can(user.role, "content.manage") &&
              (isFeatured ? (
                <span className="rounded bg-sapin/15 px-3 py-1.5 text-sm text-sapin">À la une de l&apos;accueil</span>
              ) : (
                <ActionForm action={featureCollectionOnHome}>
                  <input type="hidden" name="collectionId" value={collection.id} />
                  <Submit className={btnSm}>Mettre à la une de l&apos;accueil</Submit>
                </ActionForm>
              ))}
          </>
        }
      />
      <CollectionForm collection={collection} />
      <Card title="Produits et ordre d'affichage" className="mt-8">
        <CollectionProductsEditor
          collectionId={collection.id}
          initial={collection.products.map((p) => p.productId)}
          all={products.map((p) => ({ id: p.id, name: p.name, status: p.status, priceCents: p.priceCents, imageUrl: p.images[0]?.url ?? null }))}
        />
      </Card>
      <Card title="Zone sensible" className="mt-8">
        <ActionForm action={deleteCollection} confirm="Supprimer cette collection ? Les produits ne sont pas supprimés." className="flex items-center justify-between gap-4 text-sm">
          <input type="hidden" name="id" value={collection.id} />
          <p className="text-ink-soft">Supprime la collection et sa couverture. Les produits restent dans le catalogue.</p>
          <Submit className={btnDangerSm}>Supprimer la collection</Submit>
        </ActionForm>
      </Card>
    </>
  );
}
