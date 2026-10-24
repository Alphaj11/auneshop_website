"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import type { ProductCardData } from "@/lib/catalog";
import { Price } from "@/components/ui/Price";
import { useMotionPref } from "@/components/ui/MotionPref";
import { useCart } from "./CartProvider";

export function ProductCard({
  product,
  priority = false,
  size = "md",
}: {
  product: ProductCardData;
  priority?: boolean;
  size?: "md" | "lg";
}) {
  const [hover, setHover] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const { add, pending } = useCart();
  const { features } = useMotionPref();
  const look = product.looks.find((l) => l.color === color);
  const mainSrc = look?.gallery ?? product.image?.url;
  const showHover = features.hoverEffects && hover && !color && product.hoverImage;

  return (
    <article
      className="group relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setColor(null);
      }}
    >
      <div className="relative">
      <Link href={`/produits/${product.slug}`} className="block" aria-label={`${product.name}, voir la fiche`}>
        <div className={`relative overflow-hidden rounded-[3px] bg-paper-2 ${size === "lg" ? "aspect-[4/5]" : "aspect-[4/5]"}`}>
          {mainSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainSrc}
              alt={product.image?.alt ?? product.name}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover transition-[transform,opacity] duration-[1.1s] ease-[var(--ease-cloth)] ${
                features.hoverEffects ? "group-hover:scale-[1.04]" : ""
              } ${showHover ? "opacity-0" : "opacity-100"}`}
            />
          )}
          {product.hoverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.hoverImage.url}
              alt=""
              aria-hidden
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${showHover ? "opacity-100" : "opacity-0"}`}
            />
          )}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.isNew && <span className="rounded-full bg-paper/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">Nouveau</span>}
            {product.isPreorder && <span className="rounded-full bg-paper/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">Précommande</span>}
            {!product.available && <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-paper">Épuisé</span>}
          </div>
          {product.isDemo && (
            <span className="absolute right-3 top-3 rounded bg-ink/70 px-2 py-0.5 text-[10px] uppercase tracking-widest text-paper" title="Produit fictif de démonstration">
              Exemple
            </span>
          )}
        </div>
      </Link>

      {/* Ajout rapide : tailles du premier coloris disponible */}
      {product.available && product.quick.length > 0 && (
        <motion.div
          initial={false}
          animate={{ opacity: hover ? 1 : 0, y: hover ? 0 : 8 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute inset-x-3 bottom-3 hidden md:block"
        >
          <div className={`flex flex-wrap items-center gap-1 rounded-full bg-paper/95 p-1.5 shadow-sm backdrop-blur ${hover ? "pointer-events-auto" : ""}`} aria-label={`Ajout rapide, ${product.quick[0].color}`}>
            {product.quick.map((v) => (
              <button
                key={v.variantId}
                type="button"
                tabIndex={hover ? 0 : -1}
                disabled={!v.available || pending}
                onClick={() => add(v.variantId)}
                className="h-8 min-w-8 rounded-full px-2 text-xs transition-colors hover:bg-ink hover:text-paper disabled:text-ink-mute disabled:line-through disabled:hover:bg-transparent"
                aria-label={`Ajouter ${product.name} taille ${v.size} au panier`}
              >
                {v.size}
              </button>
            ))}
          </div>
        </motion.div>
      )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className={`font-display leading-tight ${size === "lg" ? "text-2xl" : "text-lg"}`}>
            <Link href={`/produits/${product.slug}`}>{product.name}</Link>
          </h3>
          {product.colors.length > 1 && (
            <ul className="mt-2 flex gap-1.5" aria-label="Coloris disponibles">
              {product.colors.map((c) => (
                <li key={c.name}>
                  <button
                    type="button"
                    onMouseEnter={() => setColor(c.name)}
                    onFocus={() => setColor(c.name)}
                    onClick={() => setColor(c.name)}
                    className={`block h-3.5 w-3.5 rounded-full border transition-transform hover:scale-125 ${color === c.name ? "border-ink" : "border-ink/20"}`}
                    style={{ background: c.hex ?? "#ccc" }}
                    aria-label={`Voir le coloris ${c.name}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <Price cents={product.priceCents} compareAt={product.compareAtPriceCents} className="shrink-0 text-sm" />
      </div>
    </article>
  );
}
