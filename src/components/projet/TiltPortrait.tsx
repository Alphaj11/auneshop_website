"use client";

import { useEffect, useRef } from "react";
import { useMotionPref } from "@/components/ui/MotionPref";

/**
 * Portrait qui répond au curseur : légère inclinaison 3D du cadre, la photo glisse en sens
 * inverse (profondeur) et un reflet de lumière suit la souris. Immobile au toucher ou si les
 * animations sont réduites.
 */
export function TiltPortrait({ src, alt, credit }: { src: string; alt: string; credit: string }) {
  const card = useRef<HTMLDivElement>(null);
  const { reduced } = useMotionPref();

  useEffect(() => {
    const el = card.current;
    if (!el || reduced || matchMedia("(pointer: coarse)").matches) return;
    const img = el.querySelector<HTMLElement>("[data-depth]");
    const sheen = el.querySelector<HTMLElement>("[data-sheen]");
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    const frame = () => {
      raf = 0;
      cur.x += (target.x - cur.x) * 0.1;
      cur.y += (target.y - cur.y) * 0.1;
      el.style.transform = `perspective(1100px) rotateY(${(cur.x * 7).toFixed(2)}deg) rotateX(${(-cur.y * 5).toFixed(2)}deg)`;
      if (img) img.style.transform = `scale(1.08) translate(${(-cur.x * 14).toFixed(1)}px, ${(-cur.y * 10).toFixed(1)}px)`;
      if (sheen) sheen.style.background = `radial-gradient(circle at ${50 + cur.x * 40}% ${40 + cur.y * 40}%, rgba(255,246,230,.22), transparent 55%)`;
      if (Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.001) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      // Direction du curseur par rapport au centre de l'écran (-1 … 1).
      target.x = Math.max(-1, Math.min(1, (e.clientX / innerWidth) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, (e.clientY / innerHeight) * 2 - 1));
      if (!raf) raf = requestAnimationFrame(frame);
    };
    addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  return (
    <figure className="relative mx-auto w-full max-w-[24rem]">
      <div
        ref={card}
        className="relative aspect-[2/3] overflow-hidden rounded-t-full shadow-[0_40px_80px_-40px_rgba(62,8,18,.55)] will-change-transform"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-depth src={src} alt={alt} className="h-full w-full scale-[1.08] object-cover" />
        <div data-sheen aria-hidden className="pointer-events-none absolute inset-0" />
      </div>
      <figcaption className="mt-3 text-center text-[11px] text-ink-mute">{credit}</figcaption>
    </figure>
  );
}
