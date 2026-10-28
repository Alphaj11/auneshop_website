"use client";

import { useEffect, useRef } from "react";
import { useMotionPref } from "@/components/ui/MotionPref";

/** Yeux : centre (repère du dessin 600 × 820) et amplitude du regard. */
const EYES = [
  { id: "m1", x: 272, y: 226, r: 5 },
  { id: "m2", x: 328, y: 226, r: 5 },
  { id: "c1", x: 206, y: 452, r: 3.5 },
  { id: "c2", x: 236, y: 452, r: 3.5 },
];

/**
 * Une mère et son enfant, en illustration douce (aplats, traits fins), dont les regards
 * suivent le pointeur. Au toucher, ils regardent doucement autour d'eux ; si les animations
 * sont réduites, l'illustration reste immobile.
 */
export function MotherIllustration({ className }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const { reduced } = useMotionPref();

  useEffect(() => {
    const el = svg.current;
    if (!el || reduced) return;
    const pupils = EYES.map((e) => el.querySelector<SVGGElement>(`[data-eye="${e.id}"]`));
    let target = { x: 0, y: 0 }; // direction normalisée du regard (-1…1)
    const cur = { x: 0, y: 0 };
    let raf = 0;
    const coarse = matchMedia("(pointer: coarse)").matches;

    const look = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      const ex = r.left + r.width * 0.42;
      const ey = r.top + r.height * 0.32;
      const dx = cx - ex;
      const dy = cy - ey;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 400);
      target = { x: (dx / d) * k, y: (dy / d) * k };
      request();
    };
    const frame = (t: number) => {
      raf = 0;
      if (coarse) {
        // Regard qui flâne doucement, sans pointeur.
        target = { x: Math.sin(t / 2100) * 0.7, y: Math.sin(t / 3300) * 0.35 };
      }
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      EYES.forEach((e, i) => pupils[i]?.setAttribute("transform", `translate(${(cur.x * e.r).toFixed(2)} ${(cur.y * e.r * 0.7).toFixed(2)})`));
      if (coarse || Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.002) request();
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => look(e.clientX, e.clientY);
    if (coarse) request();
    else addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  const skin = "#A86C4A";
  const skinChild = "#B97B56";
  const hair = "#2A1A14";
  const ink = "#3E0812";
  return (
    <svg ref={svg} viewBox="0 0 600 820" className={className} role="img" aria-label="Illustration : une mère et son enfant dans les bras">
      {/* Fond : halo chaud */}
      <circle cx="300" cy="330" r="270" fill="#D9C3A5" opacity=".45" />
      {/* Cheveux, chignon */}
      <ellipse cx="300" cy="215" rx="92" ry="104" fill={hair} />
      <circle cx="372" cy="138" r="44" fill={hair} />
      {/* Corps et drapé */}
      <path d="M186 372 C220 336 380 336 414 372 C452 470 470 640 470 820 L130 820 C130 640 148 470 186 372 Z" fill="#B5562F" />
      <path d="M392 352 C340 430 280 520 220 640 C200 700 190 760 186 820 L260 820 C268 720 300 600 414 470 C420 430 414 392 392 352 Z" fill="#C2923A" opacity=".9" />
      <path d="M300 392 C330 460 352 540 360 640" stroke={ink} strokeOpacity=".18" strokeWidth="2" fill="none" />
      {/* Cou */}
      <path d="M272 286 L272 344 C290 356 310 356 328 344 L328 286 Z" fill={skin} />
      {/* Visage */}
      <ellipse cx="300" cy="230" rx="68" ry="84" fill={skin} />
      <path d="M232 214 C236 150 280 132 300 132 C340 132 368 160 368 214 C352 180 320 168 300 170 C276 170 248 186 232 214 Z" fill={hair} />
      <circle cx="233" cy="252" r="6" fill="#C2923A" />
      <circle cx="367" cy="252" r="6" fill="#C2923A" />
      {/* Sourcils, nez, bouche */}
      <path d="M254 206 C264 199 280 199 288 205 M312 205 C320 199 336 199 346 206" stroke={hair} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M300 236 C296 252 296 262 304 266" stroke={ink} strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M284 284 C294 292 308 292 318 284" stroke={ink} strokeOpacity=".7" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="300" cy="196" r="3.2" fill="#9A2A2A" />
      {/* Yeux de la mère */}
      {EYES.slice(0, 2).map((e) => (
        <g key={e.id}>
          <ellipse cx={e.x} cy={e.y} rx="13" ry="8" fill="#F6EEE2" />
          <g data-eye={e.id}>
            <circle cx={e.x} cy={e.y} r="5.6" fill={hair} />
            <circle cx={e.x + 1.6} cy={e.y - 1.8} r="1.4" fill="#fff" opacity=".85" />
          </g>
          <path d={`M${e.x - 14} ${e.y - 2} C${e.x - 6} ${e.y - 11} ${e.x + 6} ${e.y - 11} ${e.x + 14} ${e.y - 2}`} stroke={hair} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {/* L'enfant, porté sur le bras */}
      <ellipse cx="226" cy="560" rx="62" ry="74" fill="#E3CB86" />
      <circle cx="221" cy="458" r="46" fill={skinChild} />
      <path d="M176 448 C178 414 204 400 224 402 C250 404 268 420 268 446 C254 428 236 422 222 424 C204 426 188 434 176 448 Z" fill={hair} />
      <path d="M210 486 C218 492 228 492 234 486" stroke={ink} strokeOpacity=".7" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="198" cy="474" r="7" fill="#C76F5A" opacity=".25" />
      <circle cx="246" cy="474" r="7" fill="#C76F5A" opacity=".25" />
      {EYES.slice(2).map((e) => (
        <g key={e.id}>
          <ellipse cx={e.x} cy={e.y} rx="8.5" ry="6.5" fill="#F6EEE2" />
          <g data-eye={e.id}>
            <circle cx={e.x} cy={e.y} r="4.2" fill={hair} />
            <circle cx={e.x + 1.2} cy={e.y - 1.4} r="1.1" fill="#fff" opacity=".85" />
          </g>
        </g>
      ))}
      {/* Le bras de la mère qui porte l'enfant */}
      <path d="M150 600 C176 640 250 660 330 616 C352 604 352 580 332 578 C276 600 214 600 170 572 Z" fill={skin} />
      <path d="M150 600 C176 640 250 660 330 616" stroke={ink} strokeOpacity=".2" strokeWidth="2" fill="none" />
      <circle cx="318" cy="606" r="9" fill="none" stroke="#C2923A" strokeWidth="3" />
    </svg>
  );
}
