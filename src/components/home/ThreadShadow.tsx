"use client";

import { useEffect, useMemo, useState } from "react";
import { DOT, STROKES, sample, type P } from "@/components/immersive/Intro";
import { useMotionPref } from "@/components/ui/MotionPref";

/** Rythme constant : un logo dessiné toutes les CYCLE ms, à un nouvel endroit à chaque fois. */
const CYCLE = 6500;
const DRAW = 2.8; // s : le fil trace les lettres
/** Emplacements possibles (en % de la scène), loin du titre en bas à gauche. */
const SPOTS = [
  { x: 62, y: 18, w: 26, r: -8 },
  { x: 74, y: 52, w: 20, r: 6 },
  { x: 40, y: 12, w: 22, r: 4 },
  { x: 58, y: 70, w: 24, r: -5 },
  { x: 80, y: 28, w: 18, r: -12 },
  { x: 48, y: 40, w: 20, r: 9 },
];

const toD = (pts: P[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

/**
 * Ombre de fil sur le carrousel d'accueil : un fil invisible passe devant la lumière et son
 * ombre trace le logo « au·ne », un endroit à la fois, à fréquence constante.
 * Purement décoratif (aria-hidden) ; absent si les animations sont réduites.
 */
export function ThreadShadow() {
  const { reduced } = useMotionPref();
  const [cycle, setCycle] = useState(0);
  const strokes = useMemo(() => {
    const all = [STROKES[0], STROKES[1], DOT, STROKES[2], STROKES[3]].map(sample);
    const total = all.reduce((n, s) => n + s.length, 0);
    let acc = 0;
    return all.map((pts) => {
      const start = acc / total;
      acc += pts.length;
      return { d: toD(pts), start, share: pts.length / total };
    });
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setCycle((c) => c + 1), CYCLE);
    return () => clearInterval(id);
  }, [reduced]);

  if (reduced) return null;
  const spot = SPOTS[cycle % SPOTS.length];

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      <svg
        key={cycle}
        viewBox="0 0 605 173"
        className="thread-shadow absolute"
        style={{
          left: `${spot.x}%`,
          top: `${spot.y}%`,
          width: `${spot.w}%`,
          transform: `translate(-50%, -50%) rotate(${spot.r}deg) skewX(-14deg)`,
          animationDuration: `${CYCLE}ms`,
        }}
      >
        {strokes.map((s, i) => (
          <path
            key={i}
            d={s.d}
            pathLength={1}
            style={{ animationDuration: `${DRAW * s.share}s`, animationDelay: `${DRAW * s.start}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
