"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useMotionPref } from "@/components/ui/MotionPref";
import { ArrowIcon } from "@/components/shop/Icons";

export type HeroSlide = {
  /** Libellé court : onglet du carrousel et surtitre. */
  label: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  /** Cadrage de la photo (object-position). */
  focus?: string;
  ctaLabel: string;
  ctaHref: string;
};

const DELAY = 6500;

/**
 * Bandeau d'accueil en carrousel (Femme · Homme · Histoire) : fondu enchaîné,
 * lent zoom de la photo, titre révélé mot à mot. Les onglets sont des fils
 * qui se remplissent pendant l'affichage de chaque image ; défilement automatique
 * suspendu au survol, au focus clavier et si l'animation est réduite.
 */
export function Hero({ slides }: { slides: HeroSlide[] }) {
  const ref = useRef<HTMLElement>(null);
  const { reduced } = useMotionPref();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "10%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "-30%"]);
  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || reduced || count < 2) return;
    const id = setTimeout(() => go(index + 1), DELAY);
    return () => clearTimeout(id);
  }, [index, paused, reduced, count, go]);

  const slide = slides[index];
  const words = slide.title.split(" ");

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] overflow-hidden bg-paper-2"
      aria-roledescription="carrousel"
      aria-label="À la une"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <motion.div style={{ y: imgY }} className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.img
              src={slide.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: slide.focus ?? "70% center" }}
              initial={{ scale: reduced ? 1 : 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: reduced ? 0 : DELAY / 1000 + 1.5, ease: "linear" }}
              fetchPriority={index === 0 ? "high" : "auto"}
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-paper/90 via-paper/45 to-transparent md:from-paper/80" />
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-paper/90 via-paper/50 to-transparent md:h-1/3 md:from-paper/70 md:via-transparent" />
      </motion.div>

      <motion.div
        style={{ y: textY }}
        className="relative mx-auto flex min-h-[100svh] max-w-[1600px] flex-col justify-end px-5 pb-28 pt-32 md:px-10 md:pb-32"
        aria-live={paused ? "polite" : "off"}
      >
        <AnimatePresence mode="wait">
          <motion.div key={index} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
            <motion.p
              className="eyebrow mb-6"
              initial={{ opacity: 0, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, letterSpacing: "0.28em" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              {slide.label}
            </motion.p>
            <h1 className="display-xl max-w-[15ch]">
              {words.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top">
                  <motion.span
                    className="inline-block"
                    initial={{ y: "105%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 1, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {w}&nbsp;
                  </motion.span>
                </span>
              ))}
            </h1>
            {slide.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-7 max-w-md text-lg text-ink-soft"
              >
                {slide.subtitle}
              </motion.p>
            )}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <Link href={slide.ctaHref} className="btn btn-primary">
                {slide.ctaLabel} <ArrowIcon />
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Onglets-fils : chaque fil se tend pendant l'affichage de son image. */}
      <div className="absolute inset-x-0 bottom-6 z-10 mx-auto flex max-w-[1600px] gap-4 px-5 md:bottom-8 md:gap-6 md:px-10" role="tablist" aria-label="Choisir une image">
        {slides.map((s, i) => (
          <button
            key={s.label}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => go(i)}
            className="group flex min-h-11 min-w-0 flex-1 flex-col justify-end gap-2 text-left text-[0.62rem] uppercase tracking-[0.18em] md:w-40 md:flex-none md:text-[0.68rem] md:tracking-[0.22em]"
          >
            <span className={i === index ? "text-ink" : "text-ink-soft transition-colors group-hover:text-ink"}>{s.label}</span>
            <span className="relative block h-px w-full bg-ink/20">
              <span
                key={i === index ? `on-${index}` : "off"}
                className="absolute inset-y-[-0.5px] left-0 block h-[2px] origin-left bg-ink"
                style={{
                  width: "100%",
                  transform: `scaleX(${i === index && reduced ? 1 : 0})`,
                  animation:
                    i === index && !reduced ? `hero-thread ${DELAY}ms linear forwards` : undefined,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
