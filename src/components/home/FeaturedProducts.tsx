import type { ProductCardData } from "@/lib/catalog";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/ui/Reveal";

/** Grille éditoriale asymétrique : la première pièce occupe deux rangées. */
export function FeaturedProducts({ title, subtitle, products }: { title: string; subtitle?: string; products: ProductCardData[] }) {
  if (!products.length) return null;
  return (
    <section className="mx-auto max-w-[1600px] px-5 py-20 md:px-10" aria-labelledby="featured-products-title">
      <div className="mb-12 flex items-end justify-between gap-6">
        <Reveal>
          {subtitle && <p className="eyebrow">{subtitle}</p>}
          <h2 id="featured-products-title" className="display-lg mt-4">
            {title}
          </h2>
        </Reveal>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
        {products.slice(0, 5).map((p, i) => (
          <Reveal
            key={p.id}
            delay={(i % 4) * 0.08}
            className={i === 0 ? "col-span-2 md:row-span-2" : ""}
          >
            <ProductCard product={p} size={i === 0 ? "lg" : "md"} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
