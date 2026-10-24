"use client";

import { motion } from "motion/react";
import { useMotionPref } from "@/components/ui/MotionPref";

/** Transition entre les pages : léger fondu et glissement, comme un tissu qui retombe. */
export default function Template({ children }: { children: React.ReactNode }) {
  const { reduced, features } = useMotionPref();
  if (reduced || !features.pageTransitions) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
