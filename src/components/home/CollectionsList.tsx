"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowIcon } from "@/components/shop/Icons";

type Col = { slug: string; name: string; tagline: string; coverImageUrl: string | null; accentColor: string };

/** Liste éditoriale : au survol, la couverture suit le curseur. */
export function CollectionsList({ title, subtitle, collections }: { title: string; subtitle?: string; collections: Col[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 25 });
  const sy = useSpring(y, { stiffness: 200, damping: 25 });

  return (
    <section className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-36" aria-labelledby="collections-title">
      <Reveal>
        {subtitle && <p className="eyebrow">{subtitle}</p>}
        <h2 id="collections-title" className="display-lg mt-4">
          {title}
        </h2>
      </Reveal>
      <ul
        className="relative mt-14 border-t border-line"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          x.set(e.clientX - r.left);
          y.set(e.clientY - r.top);
        }}
        onMouseLeave={() => setHovered(null)}
      >
        {collections.map((c, i) => (
          <Reveal as="li" key={c.slug} delay={i * 0.06} className="border-b border-line">
            <Link
              href={`/collections/${c.slug}`}
              onMouseEnter={() => setHovered(i)}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-6 md:gap-10 md:py-9"
            >
              <span className="w-8 text-sm tabular-nums text-ink-mute">0{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-display text-3xl transition-[transform,color] duration-700 ease-[var(--ease-cloth)] group-hover:translate-x-4 md:text-6xl">
                  {c.name}
                </span>
                <span className="mt-1 block text-sm text-ink-soft">{c.tagline}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="relative hidden h-16 w-14 overflow-hidden rounded-sm bg-paper-2 sm:block md:hidden">
                  {c.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line transition-colors duration-500 group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
                  <ArrowIcon />
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
        <AnimatePresence>
          {hovered !== null && collections[hovered]?.coverImageUrl && (
            <motion.div
              key="preview"
              className="pointer-events-none absolute left-0 top-0 z-10 hidden h-64 w-52 overflow-hidden rounded-[3px] shadow-2xl md:block"
              style={{ x: sx, y: sy, translateX: "-50%", translateY: "-60%" }}
              initial={{ opacity: 0, scale: 0.8, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.4 }}
              aria-hidden
            >
              <AnimatePresence mode="popLayout">
                <motion.img
                  key={hovered}
                  src={collections[hovered].coverImageUrl!}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  initial={{ opacity: 0, scale: 1.15 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </ul>
    </section>
  );
}
