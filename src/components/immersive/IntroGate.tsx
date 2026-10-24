"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Intro, introState } from "./Intro";

type Props = React.ComponentProps<typeof Intro>;

/** L'introduction n'est jouée qu'à l'arrivée sur la page d'accueil (ou avec ?intro=1). */
function Gate(props: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (introState.done) return null;
  if (pathname !== "/" && params.get("intro") !== "1") return null;
  return <Intro {...props} />;
}

export function IntroGate(props: Props) {
  return (
    <Suspense fallback={null}>
      <Gate {...props} />
    </Suspense>
  );
}
