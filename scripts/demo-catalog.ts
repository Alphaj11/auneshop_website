/**
 * Catalogue de DÉMONSTRATION.
 *
 * Tout ce fichier est fictif : noms, prix, descriptions, matières et stocks
 * sont des exemples destinés à être remplacés par les vrais produits Aune.
 * Ne pas réutiliser ces informations comme données réelles.
 */
import type { GarmentType } from "../src/lib/garments";

export type DemoColor = { name: string; hex: string; secondary?: string; stripes?: string };

export const colors = {
  ecru: { name: "Écru", hex: "#EDE6D6" },
  terre: { name: "Terre cuite", hex: "#B5562F" },
  sapin: { name: "Vert sapin", hex: "#2F4A3A" },
  vanille: { name: "Jaune vanille", hex: "#E3CB86" },
  rose: { name: "Rose poudré", hex: "#E3B9B3" },
  noir: { name: "Noir", hex: "#1F1D1B" },
  gris: { name: "Gris chiné", hex: "#9C9790" },
  indigo: { name: "Indigo", hex: "#34436A" },
  ocre: { name: "Ocre", hex: "#C2923A" },
  rayeBleu: { name: "Rayé bleu", hex: "#EDE6D6", stripes: "#34436A" },
  rayeJaune: { name: "Rayé vanille", hex: "#F3EEE2", stripes: "#D9B860" },
  sapinEcru: { name: "Vert sapin / Écru", hex: "#2F4A3A", secondary: "#EDE6D6" },
  noirTerre: { name: "Noir / Terre cuite", hex: "#1F1D1B", secondary: "#B5562F" },
  ocreEcru: { name: "Ocre / Écru", hex: "#C2923A", secondary: "#EDE6D6" },
  indigoRose: { name: "Indigo / Rose poudré", hex: "#34436A", secondary: "#E3B9B3" },
} satisfies Record<string, DemoColor>;

export type DemoProduct = {
  slug: string;
  name: string;
  type: GarmentType;
  category: string;
  priceCents: number;
  compareAtPriceCents?: number;
  colors: DemoColor[];
  sizes: string[];
  short: string;
  description: string;
  featured?: boolean;
  isNew?: boolean;
  preorder?: boolean;
  status?: "draft" | "active" | "archived";
  weightGrams: number;
};

const W = ["XS", "S", "M", "L", "XL"];
const M = ["S", "M", "L", "XL", "XXL"];

export const categories = [
  { slug: "robes", name: "Robes", department: "femme" },
  { slug: "hauts", name: "Hauts", department: "femme" },
  { slug: "bas", name: "Bas", department: "femme" },
  { slug: "vestes", name: "Vestes", department: "mixte" },
  { slug: "hauts-homme", name: "Hauts homme", department: "homme" },
  { slug: "bas-homme", name: "Bas homme", department: "homme" },
  { slug: "accessoires", name: "Accessoires", department: "mixte" },
];

export const products: DemoProduct[] = [
  {
    slug: "robe-ama",
    name: "Robe Ama",
    type: "dress",
    category: "robes",
    priceCents: 11000,
    colors: [colors.terre, colors.ecru, colors.noir],
    sizes: W,
    short: "Robe dos nu à encolure nouée, ample et légère.",
    description:
      "Exemple de description. Une robe d'été qui se noue derrière la nuque, avec une jupe évasée qui accompagne le pas. Pensée pour être portée seule ou superposée.",
    featured: true,
    preorder: true,
    weightGrams: 350,
  },
  {
    slug: "robe-sela",
    name: "Robe Sela",
    type: "dress",
    category: "robes",
    priceCents: 12500,
    colors: [colors.sapin, colors.vanille],
    sizes: W,
    short: "Robe midi à taille marquée.",
    description: "Exemple de description. Une coupe nette, une taille soulignée par une ceinture contrastée et des plis souples.",
    isNew: true,
    weightGrams: 380,
  },
  {
    slug: "robe-lys",
    name: "Robe Lys",
    type: "dress",
    category: "robes",
    priceCents: 14000,
    colors: [colors.rose, colors.ecru],
    sizes: W,
    short: "Robe longue fluide, pour les soirs d'été.",
    description: "Exemple de description. Une silhouette fluide aux finitions soignées, pensée pour durer plusieurs saisons.",
    isNew: true,
    weightGrams: 400,
  },
  {
    slug: "haut-ilo",
    name: "Haut Ilo",
    type: "top",
    category: "hauts",
    priceCents: 7000,
    colors: [colors.ecru, colors.rose, colors.rayeBleu],
    sizes: W,
    short: "Haut à manches longues, col boutonné.",
    description: "Exemple de description. Coupe droite légèrement ample, col montant fermé par trois boutons.",
    featured: true,
    weightGrams: 300,
  },
  {
    slug: "haut-siel",
    name: "Haut Siel",
    type: "top",
    category: "hauts",
    priceCents: 6500,
    colors: [colors.vanille, colors.rose],
    sizes: W,
    short: "Haut léger aux tons lumineux.",
    description: "Exemple de description. Un haut simple à superposer, aux couleurs douces.",
    isNew: true,
    weightGrams: 280,
  },
  {
    slug: "t-shirt-nao",
    name: "T-shirt Nao",
    type: "tshirt",
    category: "hauts",
    priceCents: 5000,
    colors: [colors.ecru, colors.noir, colors.gris, colors.terre],
    sizes: W,
    short: "Le t-shirt du quotidien, coupe droite.",
    description: "Exemple de description. Manches courtes, encolure ronde, une base qui se porte avec tout.",
    weightGrams: 220,
  },
  {
    slug: "chemise-oren",
    name: "Chemise Oren",
    type: "shirt",
    category: "hauts",
    priceCents: 8500,
    colors: [colors.rayeBleu, colors.ecru, colors.indigo],
    sizes: W,
    short: "Chemise à poche poitrine, rayures franches.",
    description: "Exemple de description. Une chemise classique revisitée, à porter ouverte ou boutonnée.",
    weightGrams: 320,
  },
  {
    slug: "veste-talo",
    name: "Veste Talo",
    type: "jacket",
    category: "vestes",
    priceCents: 19500,
    colors: [colors.sapinEcru, colors.noirTerre],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    short: "Veste à col contrasté, entre blouson et veste de travail.",
    description:
      "Exemple de description. Col montant et poignets dans une couleur contrastée, fermeture centrale. Une pièce forte qui structure une tenue.",
    featured: true,
    preorder: true,
    weightGrams: 650,
  },
  {
    slug: "veste-mira",
    name: "Veste Mira",
    type: "jacket",
    category: "vestes",
    priceCents: 18500,
    colors: [colors.ocreEcru, colors.indigoRose],
    sizes: W,
    short: "Veste courte, finitions contrastées.",
    description: "Exemple de description. Une veste légère aux finitions bicolores, pour la mi-saison.",
    isNew: true,
    preorder: true,
    weightGrams: 600,
  },
  {
    slug: "pantalon-lune",
    name: "Pantalon Lune",
    type: "trousers",
    category: "bas",
    priceCents: 9500,
    compareAtPriceCents: 11500,
    colors: [colors.ecru, colors.noir, colors.terre],
    sizes: W,
    short: "Pantalon large à pinces, taille haute.",
    description: "Exemple de description. Jambes amples, pinces marquées, une allure à la fois souple et structurée.",
    featured: true,
    weightGrams: 450,
  },
  {
    slug: "jupe-doa",
    name: "Jupe Doa",
    type: "skirt",
    category: "bas",
    priceCents: 7500,
    colors: [colors.vanille, colors.terre],
    sizes: W,
    short: "Jupe trapèze mi-longue.",
    description: "Exemple de description. Une jupe trapèze à ceinture plate, facile à vivre.",
    weightGrams: 300,
  },
  {
    slug: "jupe-elan",
    name: "Jupe Élan",
    type: "skirt",
    category: "bas",
    priceCents: 8000,
    colors: [colors.rayeJaune, colors.sapin],
    sizes: W,
    short: "Jupe rayée, mouvement ample.",
    featured: true,
    description: "Exemple de description. Des rayures verticales qui allongent la silhouette.",
    weightGrams: 320,
  },
  {
    slug: "chemise-aro",
    name: "Chemise Aro",
    type: "shirt",
    category: "hauts-homme",
    priceCents: 9000,
    colors: [colors.ecru, colors.sapin],
    sizes: M,
    short: "Chemise homme, coupe droite.",
    description: "Exemple de description. Une chemise à col classique, à porter rentrée ou non.",
    weightGrams: 340,
  },
  {
    slug: "t-shirt-kai",
    name: "T-shirt Kai",
    type: "tshirt",
    category: "hauts-homme",
    priceCents: 5500,
    colors: [colors.noir, colors.ecru, colors.indigo],
    sizes: M,
    short: "T-shirt homme épais, tombé net.",
    description: "Exemple de description. Un t-shirt dense à la coupe droite.",
    weightGrams: 260,
  },
  {
    slug: "pantalon-rive",
    name: "Pantalon Rive",
    type: "trousers",
    category: "bas-homme",
    priceCents: 10500,
    colors: [colors.indigo, colors.gris],
    sizes: M,
    short: "Pantalon homme droit à pinces.",
    description: "Exemple de description. Une coupe droite et confortable, taille ajustable.",
    weightGrams: 480,
  },
  {
    slug: "cabas-trame",
    name: "Cabas Trame",
    type: "tote",
    category: "accessoires",
    priceCents: 4500,
    colors: [colors.ocre, colors.ecru],
    sizes: ["Unique"],
    short: "Grand cabas en toile, anses longues.",
    description: "Exemple de description. Un cabas spacieux pour le quotidien.",
    weightGrams: 250,
  },
  {
    slug: "veste-oka",
    name: "Veste Oka",
    type: "jacket",
    category: "vestes",
    priceCents: 21000,
    colors: [colors.noirTerre],
    sizes: W,
    short: "Brouillon : pièce en préparation.",
    description: "Exemple de produit en brouillon, invisible sur le site public.",
    status: "draft",
    weightGrams: 650,
  },
  {
    slug: "haut-ancien",
    name: "Haut Ancien",
    type: "top",
    category: "hauts",
    priceCents: 6000,
    colors: [colors.gris],
    sizes: W,
    short: "Exemple de produit archivé.",
    description: "Exemple de produit archivé, conservé pour l'historique des commandes.",
    status: "archived",
    weightGrams: 280,
  },
];

export const collections = [
  {
    slug: "terre-et-fil",
    name: "Terre & Fil",
    tagline: "Collection d'exemple · Automne",
    description:
      "Collection de démonstration. Des tons de terre et de forêt, des coupes amples, des pièces pensées pour accompagner le mouvement.",
    accent: "#B5562F",
    backdrop: "#D9C3AE",
    products: ["robe-ama", "veste-talo", "pantalon-lune", "haut-ilo", "jupe-doa", "t-shirt-nao", "robe-sela"],
    displayMode: "immersive" as const,
  },
  {
    slug: "lumiere-d-ete",
    name: "Lumière d'été",
    tagline: "Collection d'exemple · Été",
    description: "Collection de démonstration. Des couleurs lumineuses, des matières légères, des rayures franches.",
    accent: "#D9B860",
    backdrop: "#EADFC2",
    products: ["robe-lys", "haut-siel", "jupe-elan", "chemise-oren", "veste-mira", "cabas-trame"],
    displayMode: "immersive" as const,
  },
  {
    slug: "les-essentiels",
    name: "Les Essentiels",
    tagline: "Capsule d'exemple · Toute l'année",
    description: "Collection de démonstration. Les pièces de base, intemporelles, à combiner sans réfléchir.",
    accent: "#2F4A3A",
    backdrop: "#C9CFC3",
    products: ["t-shirt-nao", "haut-ilo", "pantalon-lune", "chemise-oren", "cabas-trame"],
    displayMode: "grid" as const,
  },
  {
    slug: "atelier-homme",
    name: "Atelier Homme",
    tagline: "Collection d'exemple · Homme",
    description: "Collection de démonstration. Chemises, t-shirts et pantalons aux coupes droites.",
    accent: "#34436A",
    backdrop: "#C8CCD3",
    products: ["chemise-aro", "t-shirt-kai", "pantalon-rive", "veste-talo"],
    displayMode: "immersive" as const,
  },
];

export const colorSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
