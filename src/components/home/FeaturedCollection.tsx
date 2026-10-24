"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ProductCardData } from "@/lib/catalog";
import { Reveal } from "@/components/ui/Reveal";
import { useMotionPref } from "@/components/ui/MotionPref";
import { ArrowIcon } from "@/components/shop/Icons";

/** Grande composition : couverture + aperçu orbital animé de la collection. */
export function FeaturedCollection({
  eyebrow,
  title,
  body,
  ctaLabel,
  collection,
  products,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  ctaLabel?: string;
  collection: { slug: string; name: string; tagline: string; coverImageUrl: string | null; accentColor: string; immersive: boolean };
  products: ProductCardData[];
}) {
  const { reduced } = useMotionPref();
  const orbit = products.slice(0, 6);
  return (
    <section className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-36" aria-labelledby="featured-collection-title">
      <div className="grid items-center gap-12 lg:grid-cols-12">
        <Reveal className="relative lg:col-span-7">
          <Link href={`/collections/${collection.slug}`} className="group relative block aspect-[6/5] overflow-hidden rounded-[3px] bg-paper-2">
            {collection.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={collection.coverImageUrl}
                alt={`Collection ${collection.name}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[1.6s] ease-[var(--ease-cloth)] group-hover:scale-105"
              />
            )}
            {/* Aperçu orbital : les pièces tournent autour de la composition */}
            <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
              <motion.div
                className="absolute left-1/2 top-1/2 h-[62%] w-[78%] -translate-x-1/2 -translate-y-1/2"
                animate={reduced ? undefined : { rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              >
                {orbit.map((p, i) => {
                  const a = (i / orbit.length) * Math.PI * 2;
                  const src = p.looks[0]?.cutout;
                  return src ? (
                    <motion.img
                      key={p.id}
                      src={src}
                      alt=""
                      className="absolute h-20 w-16 object-contain drop-shadow-md"
                      style={{ left: `${(50 + Math.cos(a) * 50).toFixed(2)}%`, top: `${(50 + Math.sin(a) * 50).toFixed(2)}%`, translateX: "-50%", translateY: "-50%" }}
                      animate={reduced ? undefined : { rotate: -360 }}
                      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    />
                  ) : null;
                })}
              </motion.div>
            </div>
          </Link>
        </Reveal>
        <div className="lg:col-span-5 lg:pl-8">
          <Reveal>
            <p className="eyebrow">{eyebrow ?? "La collection à la une"}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 id="featured-collection-title" className="display-lg mt-5">
              {title || collection.name}
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-3 text-sm text-ink-soft">{collection.tagline}</p>
            {body && <p className="mt-6 max-w-md text-lg leading-relaxed">{body}</p>}
          </Reveal>
          <Reveal delay={0.24} className="mt-10 flex flex-wrap gap-3">
            <Link href={`/collections/${collection.slug}`} className="btn btn-primary">
              {ctaLabel ?? "Entrer dans la collection"} <ArrowIcon />
            </Link>
            <Link href={`/collections/${collection.slug}?vue=grille`} className="btn btn-ghost">
              Vue grille
            </Link>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="mt-8 text-sm text-ink-soft">{products.length} pièces dans cette collection</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
