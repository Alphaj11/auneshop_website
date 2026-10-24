"use client";

import { createContext, useContext, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { MotionConfig } from "motion/react";

export type MotionFeatures = { scrollReveals: boolean; hoverEffects: boolean; pageTransitions: boolean };
type Pref = { reduced: boolean; userOff: boolean; setUserOff: (off: boolean) => void; features: MotionFeatures };
const allOn: MotionFeatures = { scrollReveals: true, hoverEffects: true, pageTransitions: true };
const Ctx = createContext<Pref>({ reduced: false, userOff: false, setUserOff: () => {}, features: allOn });

/**
 * Préférence d'animation : réduit si le système le demande OU si le visiteur a
 * désactivé les animations (cookie aune_motion=off, bouton dans le pied de page).
 */
export function MotionPrefProvider({
  initialOff,
  features = allOn,
  children,
}: {
  initialOff: boolean;
  features?: MotionFeatures;
  children: React.ReactNode;
}) {
  const [userOff, setOff] = useState(initialOff);
  const system = useMediaQuery("(prefers-reduced-motion: reduce)");
  const setUserOff = (off: boolean) => {
    setOff(off);
    document.cookie = `aune_motion=${off ? "off" : "on"}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.motion = off ? "off" : "on";
  };
  const reduced = system || userOff;
  return (
    <Ctx.Provider value={{ reduced, userOff, setUserOff, features }}>
      <MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig>
    </Ctx.Provider>
  );
}

export function useMotionPref() {
  return useContext(Ctx);
}
