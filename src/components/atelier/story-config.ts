/**
 * « Chaque fil a son histoire » : tout ce qui se modifie sans toucher au code de la scène.
 *
 * - MEDIA : sources vidéo (1080p / 720p) et image de repli.
 * - SCRUB : longueur du parcours et lissage du temps vidéo.
 * - BLOCKS : textes narratifs, placés par leur progression (0 = début de la scène, 1 = fin).
 *   La fin de la vidéo (après le dernier bloc) est réservée à la matière qui s'éclaircit.
 * - EDITORIAL : section qui suit la scène.
 */

export type StoryMedia = { hd: string; sd: string; poster: string; fallbackPoster: string };
export type StoryScrub = { trackScreens: number; smoothing: number; minDelta: number };

export const MEDIA: StoryMedia = {
  hd: "/media/atelier/histoire-1080.mp4",
  sd: "/media/atelier/histoire-720.mp4",
  /** Première image du clip : affichée avant le chargement, en cas d'erreur, et si les animations sont réduites. */
  poster: "/media/atelier/histoire-poster.jpg",
  /** Repli si le clip n'est pas encore installé (photo de l'atelier Aune). */
  fallbackPoster: "/demo/atelier/fils.jpg",
};

export const SCRUB: StoryScrub = {
  /** Longueur du parcours, en hauteurs d'écran (la scène reste collée pendant ce temps). */
  trackScreens: 7,
  /** Lissage : part de l'écart rattrapée à chaque image (1 = immédiat). */
  smoothing: 0.32,
  /** Écart minimal (s) avant de demander une nouvelle image à la vidéo. */
  minDelta: 1 / 60,
};

export type StoryBlock = {
  id: string;
  /** Progression (0–1) à laquelle le bloc passe au centre de l'écran. */
  at: number;
  /** Variante sur mobile (une seule colonne : on espace les blocs en miroir). */
  atMobile?: number;
  /** Disposition sur grand écran. */
  side: "center" | "left" | "right";
  eyebrow?: string;
  title: string[];
  text?: string;
  /** Taille du titre : principal (acte 2) ou standard. */
  size?: "xl" | "lg";
};

export const BLOCKS: StoryBlock[] = [
  // Acte 1 : aucun texte, la matière seule.
  { id: "fil", at: 0.24, side: "center", eyebrow: "Notre histoire", title: ["Tout", "commence", "par un", "fil."], size: "xl" },
  {
    id: "geste",
    at: 0.4,
    side: "left",
    title: ["Le temps du geste"],
    text: "Derrière chaque détail, il y a un geste. Derrière chaque finition, une attention portée à ce qui ne se voit pas toujours au premier regard.",
  },
  {
    id: "detail",
    at: 0.52,
    atMobile: 0.49,
    side: "left",
    title: ["Le soin du détail"],
    text: "Une couture, une finition, une texture : chaque détail participe à l'équilibre du vêtement.",
  },
  {
    id: "matiere",
    at: 0.58,
    atMobile: 0.6,
    side: "right",
    title: ["La matière avant tout"],
    text: "Le toucher, le tombé et la tenue donnent au tissu toute sa personnalité.",
  },
  {
    id: "durer",
    at: 0.71,
    side: "center",
    title: ["Pensé pour durer."],
    text: "Des matières aux finitions, chaque détail compte.",
  },
];

export const EDITORIAL = {
  title: ["Une histoire", "de matière", "et de passion"],
  intro:
    "Un vêtement ne se résume pas à sa silhouette. Il y a la matière que l'on choisit, les détails auxquels on prête attention et la façon dont chaque élément trouve sa place. C'est cette attention qui donne au vêtement sa personnalité.",
  /** Repères vérifiés sur auneshop.fr/pages/le-projet (octobre 2026). */
  facts: [
    "Coton filé au rouet et tissé à la main sur un métier en bois",
    "Un atelier solidaire au nord de l'Inde",
    "Fabriqué en précommande, du 1er au 25 de chaque mois",
  ],
  blocks: [
    { title: "La matière", text: "Tout commence par le choix de la matière, son toucher, son relief et sa manière de tomber." },
    {
      title: "Le savoir-faire",
      text: "Le travail du tissu repose sur une succession de gestes précis, où chaque détail contribue au résultat final.",
    },
    {
      title: "Le détail",
      text: "Ce sont parfois les détails les plus discrets qui font toute la différence : une couture, une finition ou un équilibre dans la coupe.",
    },
  ],
  cta: { label: "Découvrir la collection", href: "/collections" },
};
