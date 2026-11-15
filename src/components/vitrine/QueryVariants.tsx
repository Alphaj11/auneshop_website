"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Variant = { when: Record<string, string>; node: React.ReactNode };

function Pick({ variants, fallback }: { variants: Variant[]; fallback: React.ReactNode }) {
  const sp = useSearchParams();
  const match = variants.find((v) => Object.entries(v.when).every(([k, val]) => sp.get(k) === val));
  return <>{match ? match.node : fallback}</>;
}

/**
 * Vitrine statique : une page ne peut pas lire l'adresse côté serveur. Les variantes
 * (rayon, catégorie…) sont rendues à l'avance et choisies ici selon les paramètres de l'URL.
 */
export function QueryVariants({ variants, fallback }: { variants: Variant[]; fallback: React.ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <Pick variants={variants} fallback={fallback} />
    </Suspense>
  );
}
