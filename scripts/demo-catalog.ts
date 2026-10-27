/**
 * Catalogue de départ : 15 vraies pièces Aune réparties en 3 collections
 * (Phir, Surya, Aadmi), d'après le catalogue de travail fourni par la marque.
 *
 * Noms, prix, collections et descriptions viennent de ce catalogue. Restent à
 * confirmer avant la mise en production (voir docs/CATALOGUE-A-VERIFIER.md) :
 * les tailles et coloris marqués `toVerify`, les poids, les stocks, et les
 * visuels, qui sont encore des illustrations générées en attendant les photos.
 */
import type { GarmentType } from "../src/lib/garments";

export type DemoColor = { name: string; hex: string; secondary?: string; stripes?: string };

export const colors = {
  blanc: { name: "Blanc", hex: "#F3F0E8" },
  blancVanille: { name: "Blanc / Jaune vanillé", hex: "#F3F0E8", secondary: "#E8CF84" },
  vanille: { name: "Jaune vanillé", hex: "#E8CF84" },
  barbie: { name: "Barbie", hex: "#D9558F" },
  babyPink: { name: "Baby Pink", hex: "#F0C4CC" },
  noir: { name: "Noir", hex: "#1F1D1B" },
  rayeJaune: { name: "Rayures jaune et blanc", hex: "#F6F2E6", stripes: "#E6C34E" },
  /** Coloris non relevé dans le catalogue : à remplacer par le vrai nom. */
  aConfirmer: { name: "À confirmer", hex: "#D9D2C5" },
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
  materials: string;
  featured?: boolean;
  isNew?: boolean;
  preorder?: boolean;
  status?: "draft" | "active" | "archived";
  weightGrams: number;
  /** Informations non confirmées par le catalogue source. */
  toVerify?: string[];
};

const F = ["XS", "S", "M", "L", "XL", "2XL"];
const H = ["S", "M", "L", "XL", "2XL"];
const COTON = "Coton tissé artisanalement.";
const COTON_MAIN = "Coton tissé à la main.";

export const categories = [
  { slug: "robes", name: "Robes", department: "femme" },
  { slug: "hauts", name: "Hauts", department: "femme" },
  { slug: "bas", name: "Bas", department: "femme" },
  { slug: "vestes", name: "Vestes", department: "mixte" },
  { slug: "hauts-homme", name: "Hauts homme", department: "homme" },
];

export const products: DemoProduct[] = [
  // --- Phir ---------------------------------------------------------------
  {
    slug: "robe-lea",
    name: "Robe Léa",
    type: "dress",
    category: "robes",
    priceCents: 11000,
    colors: [colors.blancVanille],
    sizes: F,
    short: "Robe portefeuille réversible, décolleté en V.",
    description:
      "Robe portefeuille réversible, au décolleté en V, fermée par un lien latéral et des bretelles nouées. Une face blanche, une face jaune vanillé : deux robes en une.",
    materials: COTON,
    featured: true,
    preorder: true,
    weightGrams: 350,
  },
  {
    slug: "haut-lou-ann",
    name: "Haut Lou-ann",
    type: "top",
    category: "hauts",
    priceCents: 7000,
    colors: [colors.blanc],
    sizes: F,
    short: "Blouse portefeuille fluide, manches longues.",
    description:
      "Blouse portefeuille fluide au décolleté en V, à manches longues, ajustée par un lien de serrage latéral.",
    materials: COTON,
    preorder: true,
    weightGrams: 250,
  },
  {
    slug: "robe-camille",
    name: "Robe Camille",
    type: "dress",
    category: "robes",
    priceCents: 8500,
    colors: [colors.barbie],
    sizes: F,
    short: "Robe dos nu fluide, encolure froncée à nouer.",
    description: "Robe dos nu fluide, à l'encolure froncée qui se noue derrière la nuque, et au dos ajustable.",
    materials: COTON,
    preorder: true,
    weightGrams: 320,
  },
  {
    slug: "haut-malo",
    name: "Haut Malo",
    type: "top",
    category: "hauts",
    priceCents: 8000,
    colors: [colors.aConfirmer],
    sizes: F,
    short: "Haut de la collection Phir.",
    description: "Haut de la collection Phir, en coton tissé artisanalement.",
    materials: COTON,
    weightGrams: 250,
    toVerify: ["description", "tailles", "coloris"],
  },
  {
    slug: "veste-nico",
    name: "Veste Nico",
    type: "jacket",
    category: "vestes",
    priceCents: 19500,
    colors: [{ name: "Réversible", hex: "#C9B79C", secondary: "#2F4A3A" }],
    sizes: F,
    short: "Veste réversible, légère et structurée.",
    description: "Veste réversible, légère et structurée, pensée pour se porter ouverte en toute saison.",
    materials: COTON,
    featured: true,
    weightGrams: 600,
    toVerify: ["tailles", "coloris des deux faces"],
  },

  // --- Surya --------------------------------------------------------------
  {
    slug: "yash-estival",
    name: "Yash estival",
    type: "cami",
    category: "hauts",
    priceCents: 5000,
    colors: [colors.rayeJaune],
    sizes: F,
    short: "Top réversible, dos à laçage croisé.",
    description: "Top réversible au dos lacé en croisé, à bretelles ajustables. Rayures jaune et blanc.",
    materials: COTON,
    isNew: true,
    preorder: true,
    weightGrams: 180,
  },
  {
    slug: "chloe",
    name: "Chloé",
    type: "top",
    category: "hauts",
    priceCents: 5500,
    colors: [colors.aConfirmer],
    sizes: F,
    short: "Pièce de la capsule Surya.",
    description: "Pièce de la capsule Surya, en coton tissé artisanalement.",
    materials: COTON,
    isNew: true,
    weightGrams: 220,
    toVerify: ["type de pièce", "description", "tailles", "coloris"],
  },
  {
    slug: "jessica",
    name: "Jessica",
    type: "top",
    category: "hauts",
    priceCents: 6500,
    colors: [colors.barbie],
    sizes: F,
    short: "Blouse à encolure en V, liens à nouer devant.",
    description:
      "Blouse à encolure en V, fermée par deux liens à nouer sur le devant, aux manches longues légèrement évasées.",
    materials: COTON,
    featured: true,
    isNew: true,
    preorder: true,
    weightGrams: 240,
  },
  {
    slug: "jeannine",
    name: "Jeannine",
    type: "cami",
    category: "hauts",
    priceCents: 5500,
    colors: [colors.aConfirmer],
    sizes: F,
    short: "Top de la capsule Surya.",
    description: "Top de la capsule Surya, en coton tissé artisanalement.",
    materials: COTON,
    isNew: true,
    weightGrams: 180,
    toVerify: ["description", "tailles", "coloris"],
  },
  {
    slug: "odette-noir",
    name: "Odette Noir",
    type: "trousers",
    category: "bas",
    priceCents: 9000,
    colors: [colors.noir],
    sizes: ["34", "36", "38", "40", "42", "44"],
    short: "Pantalon wide leg taille haute, lien latéral.",
    description: "Pantalon taille haute à jambes larges, ajusté par un lien latéral, avec des poches discrètes.",
    materials: COTON,
    featured: true,
    isNew: true,
    preorder: true,
    weightGrams: 450,
  },

  // --- Aadmi --------------------------------------------------------------
  {
    slug: "romain",
    name: "Romain",
    type: "jacket",
    category: "vestes",
    priceCents: 11000,
    colors: [colors.aConfirmer],
    sizes: H,
    short: "Veste de la collection Aadmi.",
    description: "Veste de la collection Aadmi, aux lignes simples, amples et structurées.",
    materials: COTON_MAIN,
    weightGrams: 600,
    toVerify: ["description", "tailles", "coloris"],
  },
  {
    slug: "alain",
    name: "Alain",
    type: "shirt",
    category: "hauts-homme",
    priceCents: 7500,
    colors: [colors.aConfirmer],
    sizes: H,
    short: "Chemise de la collection Aadmi.",
    description: "Chemise de la collection Aadmi, aux lignes simples et amples.",
    materials: COTON_MAIN,
    weightGrams: 320,
    toVerify: ["description", "tailles", "coloris"],
  },
  {
    slug: "paul",
    name: "Paul",
    type: "tshirt",
    category: "hauts-homme",
    priceCents: 5000,
    colors: [colors.babyPink],
    sizes: H,
    short: "T-shirt droit légèrement ample, manches retroussables.",
    description: "T-shirt droit, légèrement ample, en coton tissé artisanalement, aux manches retroussables.",
    materials: COTON,
    preorder: true,
    weightGrams: 220,
  },
  {
    slug: "bastien",
    name: "Bastien",
    type: "shirt",
    category: "hauts-homme",
    priceCents: 7500,
    colors: [colors.vanille],
    sizes: H,
    short: "Chemise droite à col mao, poche poitrine.",
    description: "Chemise droite à col mao, au boutonnage simple, avec une poche poitrine.",
    materials: COTON_MAIN,
    featured: true,
    preorder: true,
    weightGrams: 320,
  },
  {
    slug: "sam",
    name: "Sam",
    type: "tshirt",
    category: "hauts-homme",
    priceCents: 6500,
    colors: [colors.vanille],
    sizes: H,
    short: "Chemise manches courtes, col classique.",
    description: "Chemise à manches courtes, coupe droite, col classique et poche poitrine.",
    materials: COTON_MAIN,
    preorder: true,
    weightGrams: 280,
  },
];

export const collections = [
  {
    slug: "phir",
    name: "Phir",
    tagline: "Nouveaux départs",
    description:
      "Collection contemporaine en coton tissé artisanalement, autour des nouveaux départs et des pièces polyvalentes.",
    accent: "#C9A24A",
    backdrop: "#E6DCCB",
    products: ["robe-lea", "haut-lou-ann", "robe-camille", "haut-malo", "veste-nico"],
    displayMode: "immersive" as const,
  },
  {
    slug: "surya",
    name: "Surya",
    tagline: "Le soleil du Sud",
    description:
      "Capsule lumineuse inspirée du soleil du Sud, avec des pièces à porter libres, croisées et retournées.",
    accent: "#E2B53E",
    backdrop: "#EEE2C3",
    products: ["yash-estival", "chloe", "jessica", "jeannine", "odette-noir"],
    displayMode: "immersive" as const,
  },
  {
    slug: "aadmi",
    name: "Aadmi",
    tagline: "Vestiaire masculin",
    description:
      "Vestiaire aux coupes masculines, aux lignes simples, amples et structurées, en coton tissé à la main.",
    accent: "#2F4A3A",
    backdrop: "#D6D2C8",
    products: ["romain", "alain", "paul", "bastien", "sam"],
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
