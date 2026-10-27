"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ProductCardData } from "@/lib/catalog";
import { useMediaQuery } from "@/lib/use-media-query";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { OrbitScene, type OrbitVariant } from "./OrbitScene";

type View = "immersive" | "grid";

export function CollectionExperience({
  collection,
  products,
  variants,
  immersiveAllowed,
  initialView,
  mobileDefault,
  explicitView,
  orbitSpeed,
}: {
  collection: { name: string; tagline: string; description: string; accentColor: string; isDemo: boolean };
  products: ProductCardData[];
  variants: Record<string, OrbitVariant[]>;
  immersiveAllowed: boolean;
  initialView: View;
  mobileDefault: View;
  explicitView: View | null;
  orbitSpeed: number;
}) {
  const [chosen, setChosen] = useState<View | null>(explicitView);
  const isMobile = useMediaQuery("(max-width: 767px)");
  // Sur mobile, sans choix explicite, on applique le comportement par défaut choisi dans l'administration.
  const view = chosen ?? (immersiveAllowed && isMobile ? mobileDefault : initialView);
  const router = useRouter();
  const pathname = usePathname();

  const choose = (v: View) => {
    setChosen(v);
    // Conserve les autres paramètres (ex. ?rayon=femme).
    const qs = new URLSearchParams(window.location.search);
    qs.set("vue", v === "grid" ? "grille" : "immersion");
    router.replace(`${pathname}?${qs}`, { scroll: false });
  };

  const tabs = immersiveAllowed && (
    <div role="tablist" aria-label="Mode d'affichage" className="flex w-fit rounded-full border border-line bg-paper/70 p-1 text-[11px] uppercase tracking-[0.16em] backdrop-blur">
      {(["immersive", "grid"] as const).map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={view === v}
          onClick={() => choose(v)}
          className={`rounded-full px-4 py-2.5 transition-colors ${view === v ? "bg-ink text-paper" : "hover:bg-paper-2"}`}
        >
          {v === "immersive" ? "Immersion" : "Grille"}
        </button>
      ))}
    </div>
  );
  const immersive = view === "immersive" && immersiveAllowed;

  return (
    <div className="pt-16 md:pt-20">
      {immersive ? (
        <OrbitScene
          products={products}
          variants={variants}
          accent={collection.accentColor}
          speed={orbitSpeed}
          overlay={
            <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-4 px-5 pt-5 md:px-10 md:pt-8">
              <div className="pointer-events-auto">
                <p className="eyebrow">{collection.tagline}</p>
                <h1 className="display-lg mt-2">{collection.name}</h1>
              </div>
              <div className="pointer-events-auto">{tabs}</div>
            </div>
          }
        />
      ) : (
        <header className="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 pb-6 pt-10 md:flex-row md:items-end md:justify-between md:px-10">
          <div>
            <p className="eyebrow">{collection.tagline}</p>
            <h1 className="display-xl mt-3">{collection.name}</h1>
            <p className="mt-4 max-w-xl text-ink-soft">{collection.description}</p>
          </div>
          {tabs}
        </header>
      )}

      <section className="mx-auto max-w-[1600px] px-5 pt-14 md:px-10" aria-labelledby="grid-title">
        <div className="mb-8 flex items-baseline justify-between border-b border-line pb-4">
          <h2 id="grid-title" className="eyebrow !text-ink">
            {immersive ? "Toutes les pièces de la collection" : `${products.length} pièces`}
          </h2>
          {immersive && <p className="hidden max-w-md text-right text-sm text-ink-soft md:block">{collection.description}</p>}
        </div>
        {products.length === 0 ? (
          <p className="py-20 text-center text-ink-soft">Cette collection ne contient pas encore de pièces.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 0.06}>
                <ProductCard product={p} priority={i < 4 && view === "grid"} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
