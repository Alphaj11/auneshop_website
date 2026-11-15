/**
 * Page « Le projet » : contenu repris de https://auneshop.fr/pages/le-projet (octobre 2026).
 * Aucune information ajoutée : modifier ici si la page d'origine évolue.
 */

export const PROJET = {
  eyebrow: "Le projet Aune",
  title: ["Chaque vêtement raconte", "l'histoire de la main,", "du fil et du lien."],
  intro:
    "Aune est une marque de vêtements aux coupes intemporelles, tissés à la main dans un coton vivant, selon des savoir-faire artisanaux préservés en Inde. C'est un projet solidaire : revaloriser l'artisanat textile traditionnel et soutenir l'émancipation des femmes. Chaque pièce est produite à la commande.",
  partner: {
    title: "Un partenariat qui change des vies",
    text: "Depuis vingt ans, l'ONG Tender Heart accompagne, dans la périphérie de Delhi, des femmes en situation de précarité : elle leur transmet des savoir-faire et soutient des artisanes souvent marginalisées. Aune est né au sein de cette organisation, et chaque pièce crée un lien direct avec ces femmes.",
    link: { label: "Tender Heart", href: "http://www.tenderheartngo.org/" },
  },
  commitments: {
    title: "Garder l'artisanat vivant, pour une mode éco-responsable",
    items: [
      {
        title: "Pourquoi la précommande ?",
        text: "Aune fabrique à la commande, sans stock ni gaspillage : les commandes passées entre le 1er et le 25 du mois sont livrées avant le 5 du mois suivant.",
      },
      { title: "Notre impact avec Tender Heart", text: "Au-delà du vêtement, un projet humain mené avec l'ONG Tender Heart." },
      {
        title: "Le filage et le tissage",
        text: "Chaque tissu est tissé à la main, sans machine : le coton est filé au rouet puis tissé sur un métier en bois, dans un atelier solidaire.",
      },
      { title: "C'est quoi Aune ?", text: "Une marque née dans le nord de l'Inde, au contact de femmes artisanes." },
    ],
  },
};

export type BasketCard = {
  kind: "page" | "article" | "presse";
  title: string;
  /** Média (presse) ou rubrique. */
  source: string;
  href: string;
  external?: boolean;
  date?: string;
};

/** Le contenu du panier à linge : pages du site, articles du projet et revue de presse (liens réels). */
export const BASKET: BasketCard[] = [
  { kind: "presse", source: "Mlle Adèle", title: "Aune : porter du sens, du fil à l'âme", date: "Automne-hiver 2024-2025", href: "https://auneshop.fr/blogs/la-presse-en-parle/mlle-adele", external: true },
  { kind: "presse", source: "Le Pays Malouin", title: "Éthique et solidaire : Léna Charbonnier lance Aune", date: "28 mars 2025", href: "https://auneshop.fr/blogs/la-presse-en-parle/le-pays-malouin", external: true },
  { kind: "presse", source: "ELLE Région Bretagne", title: "Chic éthique", date: "Printemps 2025", href: "https://auneshop.fr/blogs/la-presse-en-parle/elle-region-bretagne", external: true },
  { kind: "article", source: "Le projet", title: "Pourquoi la précommande ?", href: "https://auneshop.fr/blogs/le-projet/pourquoi-la-precommande", external: true },
  { kind: "article", source: "Le projet", title: "Notre impact avec Tender Heart", href: "https://auneshop.fr/blogs/le-projet/notre-impact-avec-tender-heart", external: true },
  { kind: "article", source: "Le projet", title: "Le filage et le tissage", href: "https://auneshop.fr/blogs/le-projet/le-filage-et-le-tissage", external: true },
  { kind: "article", source: "Le projet", title: "C'est quoi Aune ?", href: "https://auneshop.fr/blogs/le-projet/c-est-quoi-aune", external: true },
  { kind: "page", source: "Le site", title: "L'atelier sur mesure", href: "/atelier" },
  { kind: "page", source: "Le site", title: "Les collections", href: "/collections" },
  { kind: "page", source: "Le site", title: "Contact", href: "/contact" },
];
