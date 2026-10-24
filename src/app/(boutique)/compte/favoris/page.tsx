import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ProductCard } from "@/components/shop/ProductCard";
import { requireUser } from "@/lib/auth/guards";
import { getProductCards } from "@/lib/catalog";

export const metadata = { title: "Mes favoris" };

export default async function WishlistPage() {
  const user = await requireUser("/compte/favoris");
  const rows = await db.select().from(schema.wishlistItems).where(eq(schema.wishlistItems.userId, user.id));
  const products = await getProductCards(rows.map((r) => r.productId));
  if (!products.length)
    return (
      <div className="rounded border border-dashed border-line p-10 text-center">
        <p className="display-md">Aucun favori pour l&apos;instant.</p>
        <p className="mt-2 text-sm text-ink-soft">Ajoutez une pièce avec le cœur sur sa fiche produit.</p>
        <Link href="/collections" className="btn btn-primary mt-6">Parcourir les collections</Link>
      </div>
    );
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
