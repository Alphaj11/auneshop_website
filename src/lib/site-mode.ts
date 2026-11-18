/**
 * Mode du site. La « vitrine » est une version statique de démonstration (GitHub Pages) :
 * pas de base de données, pas de compte ni de commande, servie dans un sous-dossier.
 * Voir scripts/build-vitrine.mjs.
 */
export const VITRINE = process.env.NEXT_PUBLIC_VITRINE === "1";

/** Sous-dossier de publication (vide en temps normal). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Préfixe un chemin interne pour les liens hors next/link (balises <a>, window.location). */
export const withBase = (path: string) => (path.startsWith("/") && !path.startsWith("//") ? BASE_PATH + path : path);

/**
 * Accès à l'administration depuis la vitrine : l'adresse de l'admin hébergé (avec sa base)
 * quand elle existe (NEXT_PUBLIC_ADMIN_URL), sinon la page de présentation /espace-admin.
 */
export const VITRINE_ADMIN_HREF = process.env.NEXT_PUBLIC_ADMIN_URL || "/espace-admin";

export const VITRINE_ORDER_NOTICE = "Version de démonstration — la commande sera disponible sur la boutique.";
