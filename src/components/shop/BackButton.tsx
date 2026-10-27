"use client";

import { usePathname, useRouter } from "next/navigation";

/** Page parente quand on arrive directement sur une page (pas d'historique interne). */
function parentOf(pathname: string) {
  if (pathname.startsWith("/produits/")) return "/boutique";
  if (pathname.startsWith("/collections/")) return "/collections";
  if (pathname.startsWith("/compte/")) return "/compte";
  if (pathname.startsWith("/commande/")) return "/panier";
  return "/";
}

/**
 * Bouton « Retour » : un fil ondulé se dessine puis se referme en pointe de flèche
 * vers la gauche ; au survol, le fil file vers l'arrière et se retend.
 */
export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;

  const back = () => {
    const internal = document.referrer.startsWith(window.location.origin);
    if (internal && window.history.length > 1) router.back();
    else router.push(parentOf(pathname));
  };

  return (
    <button
      key={pathname}
      type="button"
      onClick={back}
      className="back-btn group flex min-h-11 min-w-11 items-center justify-center gap-2 text-[0.72rem] uppercase tracking-[0.18em] xl:justify-start"
      aria-label="Revenir à la page précédente"
    >
      <svg viewBox="0 0 48 22" width="40" height="18" className="back-thread overflow-visible" aria-hidden>
        <path className="back-wave" d="M46 13 C40 5 34 19 27 12 C23 8 19 11 15 11 L4 11" />
        <path className="back-head" d="M10 5 L4 11 L10 17" />
        <circle className="back-knot" cx="46" cy="13" r="1.6" />
      </svg>
      <span className="hidden xl:inline">Retour</span>
    </button>
  );
}
