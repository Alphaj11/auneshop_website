/**
 * Accueil, « L'histoire d'un vêtement » : le voyage d'une pièce, du champ de coton à celle ou
 * celui qui la porte, en passant par un vol (clip public/media/voyage/, monté avec
 * scripts/build-atelier-clip.mjs, preset « voyage »).
 *
 * Plans du clip (≈ 8 s) : champ de coton → rouet → métier à tisser → hublot au coucher du
 * soleil → au-dessus des nuages → arrivée en ville. Les faits cités viennent de
 * auneshop.fr/pages/le-projet ; le mode de transport n'y est pas précisé, d'où une formulation générale.
 */
import type { StoryBlock, StoryMedia, StoryScrub } from "@/components/atelier/story-config";

export const VOYAGE_MEDIA: StoryMedia = {
  hd: "/media/voyage/voyage-1080.mp4",
  sd: "/media/voyage/voyage-720.mp4",
  poster: "/media/voyage/voyage-poster.jpg",
  fallbackPoster: "/demo/atelier/fils.jpg",
};

export const VOYAGE_SCRUB: StoryScrub = { trackScreens: 7, smoothing: 0.32, minDelta: 1 / 60 };

/** Titre et sous-titre viennent de la section « story » de l'accueil (modifiables dans l'admin). */
export function voyageBlocks(title: string, subtitle?: string): StoryBlock[] {
  return [
    { id: "titre", at: 0.1, side: "center", eyebrow: subtitle || undefined, title: [title], size: "xl" },
    {
      id: "fil",
      at: 0.27,
      side: "left",
      title: ["Le fil"],
      text: "Tout commence dans le nord de l'Inde : le coton y est filé au rouet, à la main.",
    },
    {
      id: "toile",
      at: 0.4,
      side: "right",
      title: ["La toile"],
      text: "Puis il est tissé sur un métier en bois, sans machine, dans un atelier solidaire.",
    },
    {
      id: "voyage",
      at: 0.56,
      side: "center",
      title: ["Le voyage"],
      text: "Cousue à la commande, la pièce quitte l'atelier et traverse le monde jusqu'à vous.",
    },
    {
      id: "temps",
      at: 0.7,
      side: "left",
      title: ["Le temps juste"],
      text: "Commandée entre le 1er et le 25 du mois, elle vous est livrée avant le 5 du mois suivant.",
    },
    {
      id: "vous",
      at: 0.86,
      side: "center",
      title: ["Et commence", "son histoire avec vous."],
    },
  ];
}
