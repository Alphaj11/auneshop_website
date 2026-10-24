"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useMotionPref } from "@/components/ui/MotionPref";
import { ArrowIcon } from "@/components/shop/Icons";

export function Hero({
  title,
  subtitle,
  imageUrl,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { reduced } = useMotionPref();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.12]);
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "8%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "-30%"]);
  const words = title.split(" ");

  return (
    <section ref={ref} className="relative min-h-[100svh] overflow-hidden" aria-label="Introduction de la marque">
      {imageUrl && (
        <motion.div style={{ scale: imgScale, y: imgY }} className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover object-[70%_center]" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-paper/85 via-paper/40 to-transparent md:from-paper/70" />
        </motion.div>
      )}
      <motion.div style={{ y: textY }} className="relative mx-auto flex min-h-[100svh] max-w-[1600px] flex-col justify-end px-5 pb-16 pt-32 md:px-10 md:pb-24">
        <p className="eyebrow mb-6">Atelier · Matière · Mouvement</p>
        <h1 className="display-xl max-w-[14ch]">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top">
              <motion.span
                className="inline-block"
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1.1, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              >
                {w}&nbsp;
              </motion.span>
            </span>
          ))}
        </h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="mt-8 max-w-md text-lg text-ink-soft"
          >
            {subtitle}
          </motion.p>
        )}
        {ctaHref && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95 }} className="mt-10 flex flex-wrap gap-3">
            <Link href={ctaHref} className="btn btn-primary">
              {ctaLabel ?? "Découvrir"} <ArrowIcon />
            </Link>
            <Link href="/atelier" className="btn btn-ghost">
              L&apos;atelier
            </Link>
          </motion.div>
        )}
      </motion.div>
      <div className="absolute bottom-6 right-6 hidden items-center gap-3 text-xs uppercase tracking-[0.2em] text-ink-soft md:flex" aria-hidden>
        <span className="block h-10 w-px origin-top animate-pulse bg-ink/40" /> Défiler
      </div>
    </section>
  );
}
