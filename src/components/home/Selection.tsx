"use client";

import { useRef } from "react";
import type { ProductCardData } from "@/lib/catalog";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowIcon } from "@/components/shop/Icons";

/** Rail horizontal (nouveautés, populaires ou sélection manuelle). */
export function Selection({ title, subtitle, products }: { title: string; subtitle?: string; products: ProductCardData[] }) {
  const rail = useRef<HTMLUListElement>(null);
  const scroll = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });
  if (!products.length) return null;
  return (
    <section className="py-20" aria-labelledby="selection-title">
      <div className="mx-auto mb-10 flex max-w-[1600px] items-end justify-between px-5 md:px-10">
        <Reveal>
          {subtitle && <p className="eyebrow">{subtitle}</p>}
          <h2 id="selection-title" className="display-lg mt-4">
            {title}
          </h2>
        </Reveal>
        <div className="flex gap-2">
          <button type="button" onClick={() => scroll(-1)} aria-label="Produits précédents" className="flex h-11 w-11 items-center justify-center rounded-full border border-line hover:border-ink">
            <ArrowIcon className="rotate-180" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Produits suivants" className="flex h-11 w-11 items-center justify-center rounded-full border border-line hover:border-ink">
            <ArrowIcon />
          </button>
        </div>
      </div>
      <ul ref={rail} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 md:gap-6 md:scroll-px-10 md:px-10">
        {products.map((p) => (
          <li key={p.id} className="w-[70vw] shrink-0 snap-start sm:w-[40vw] lg:w-[23vw]">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
