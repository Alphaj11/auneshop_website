import type { Metadata } from "next";
import { ProductCard } from "@/components/shop/ProductCard";
import { listProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Recherche", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 80);
  const products = query ? await listProducts({ search: query }) : [];
  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-28 md:px-10 md:pt-36">
      <form role="search" className="flex max-w-2xl gap-3">
        <label htmlFor="search-q" className="sr-only">Rechercher</label>
        <input id="search-q" name="q" defaultValue={query} className="field" placeholder="Rechercher une pièce" />
        <button className="btn btn-primary">Chercher</button>
      </form>
      <h1 className="display-lg mt-12">{query ? `Résultats pour « ${query} »` : "Recherche"}</h1>
      {query && <p className="mt-2 text-ink-soft" role="status">{products.length} résultat(s)</p>}
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
