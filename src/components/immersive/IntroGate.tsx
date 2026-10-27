"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Intro, introSeenScript, introState } from "./Intro";

type Props = React.ComponentProps<typeof Intro>;

/**
 * L'introduction est jouée à chaque ouverture du site sur la page d'accueil
 * (une fois par onglet), ou à la demande avec ?intro=1.
 */
function Gate(props: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (introState.done) return null;
  if (pathname !== "/" && params.get("intro") !== "1") return null;
  return <Intro {...props} />;
}

export function IntroGate(props: Props) {
  return (
    <>
      {/* Avant le premier affichage : masque l'intro si elle a déjà été vue dans cet onglet. */}
      <script dangerouslySetInnerHTML={{ __html: introSeenScript(props.version) }} />
      <Suspense fallback={null}>
        <Gate {...props} />
      </Suspense>
    </>
  );
}
