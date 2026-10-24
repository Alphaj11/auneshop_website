import { db } from "@/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireStaffPage } from "@/lib/auth/guards";

export const metadata = { title: "Nouveau produit" };

export default async function NewProduct() {
  await requireStaffPage("products.manage");
  const categories = await db.query.categories.findMany({ orderBy: (t, { asc }) => [asc(t.position), asc(t.name)] });
  return (
    <>
      <PageHeader title="Nouveau produit" back={{ href: "/admin/produits", label: "Produits" }} description="Le produit est créé en brouillon : vous ajouterez ensuite variantes et images." />
      <ProductForm categories={categories} />
    </>
  );
}
