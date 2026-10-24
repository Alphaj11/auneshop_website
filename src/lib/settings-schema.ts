import { z } from "zod";

export const settingsSchema = z.object({
  store: z.object({
    name: z.string().min(1).max(80),
    logoUrl: z.string().max(500).optional().default(""),
    tagline: z.string().max(200).default(""),
    email: z.string().email(),
    phone: z.string().max(40).default(""),
    address: z.string().max(300).default(""),
    currency: z.literal("EUR").default("EUR"),
    locale: z.literal("fr-FR").default("fr-FR"),
    vatRate: z.number().int().min(0).max(30).default(20),
  }),
  shipping: z.object({
    flatRateCents: z.number().int().min(0),
    freeThresholdCents: z.number().int().min(0).nullable(),
    methodName: z.string().min(1).max(80),
    delayText: z.string().max(300),
    countries: z.array(z.string().length(2)).min(1),
    preorderText: z.string().max(500).default(""),
  }),
  inventory: z.object({
    /** Empêche de vendre au-delà du stock pour les variantes suivies. */
    preventOverselling: z.boolean().default(true),
    lowStockThreshold: z.number().int().min(0).max(1000).default(3),
  }),
  payment: z.object({
    /** Affiche Klarna / paiement fractionné si activé dans Stripe. */
    showInstallmentsNote: z.boolean().default(false),
    checkoutNotice: z.string().max(500).default(""),
  }),
  legal: z.object({
    companyName: z.string().max(200).default(""),
    legalForm: z.string().max(100).default(""),
    siret: z.string().max(40).default(""),
    vatNumber: z.string().max(40).default(""),
    publisher: z.string().max(200).default(""),
    host: z.string().max(300).default(""),
    mediator: z.string().max(300).default(""),
  }),
  social: z.object({
    instagram: z.string().max(300).default(""),
    facebook: z.string().max(300).default(""),
    tiktok: z.string().max(300).default(""),
    pinterest: z.string().max(300).default(""),
  }),
  newsletter: z.object({
    enabled: z.boolean().default(true),
    title: z.string().max(120).default(""),
    consentText: z.string().min(10).max(500),
  }),
  seo: z.object({
    defaultTitle: z.string().max(120),
    titleTemplate: z.string().max(120).default("%s · Aune"),
    defaultDescription: z.string().max(300),
    ogImageUrl: z.string().max(500).default(""),
  }),
  intro: z.object({
    enabled: z.boolean().default(true),
    line1: z.string().max(120),
    line2: z.string().max(120),
    /** "full" : animation complète ; "light" : version allégée ; "off" : aucune. */
    mobileMode: z.enum(["full", "light", "off"]).default("light"),
    garmentImageUrl: z.string().max(500).default(""),
    /** Incrémenter pour rejouer l'intro chez tous les visiteurs après modification. */
    version: z.number().int().min(1).default(1),
  }),
  experience: z.object({
    orbitEnabled: z.boolean().default(true),
    /** Comportement par défaut sur mobile dans les collections immersives. */
    mobileDefault: z.enum(["immersive", "grid"]).default("immersive"),
    pageTransitions: z.boolean().default(true),
    scrollReveals: z.boolean().default(true),
    hoverEffects: z.boolean().default(true),
    orbitSpeed: z.number().min(0).max(3).default(1),
  }),
});

export type StoreSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: StoreSettings = {
  store: {
    name: "Aune",
    logoUrl: "",
    tagline: "Avant d'être une marque, nous sommes un atelier.",
    email: "contact@auneshop.fr",
    phone: "",
    address: "Adresse à compléter (exemple)",
    currency: "EUR",
    locale: "fr-FR",
    vatRate: 20,
  },
  shipping: {
    flatRateCents: 590,
    freeThresholdCents: 15000,
    methodName: "Colissimo suivi",
    delayText: "Pièces fabriquées à la commande. Livraison avant le 5 du mois suivant (exemple, à confirmer).",
    countries: ["FR", "BE", "LU", "MC"],
    preorderText:
      "Précommandes ouvertes du 1er au 25 de chaque mois. Chaque pièce est réalisée pour vous, sans surproduction.",
  },
  inventory: { preventOverselling: true, lowStockThreshold: 3 },
  payment: { showInstallmentsNote: false, checkoutNotice: "" },
  legal: {
    companyName: "Raison sociale à compléter",
    legalForm: "",
    siret: "",
    vatNumber: "",
    publisher: "",
    host: "",
    mediator: "",
  },
  social: { instagram: "", facebook: "", tiktok: "", pinterest: "" },
  newsletter: {
    enabled: true,
    title: "Les lettres de l'atelier",
    consentText:
      "J'accepte de recevoir la newsletter d'Aune (nouvelles pièces, coulisses de l'atelier). Désinscription possible à tout moment via le lien présent dans chaque email.",
  },
  seo: {
    defaultTitle: "Aune — Vêtements nés à l'atelier",
    titleTemplate: "%s · Aune",
    defaultDescription:
      "Aune : une mode contemporaine née de la matière et du geste. Pièces en séries limitées, fabriquées à la commande.",
    ogImageUrl: "",
  },
  intro: {
    enabled: true,
    line1: "De la matière au mouvement.",
    line2: "Chaque pièce a une histoire.",
    mobileMode: "light",
    garmentImageUrl: "",
    version: 1,
  },
  experience: {
    orbitEnabled: true,
    mobileDefault: "immersive",
    pageTransitions: true,
    scrollReveals: true,
    hoverEffects: true,
    orbitSpeed: 1,
  },
};
