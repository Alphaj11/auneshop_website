import type { HomepageSectionContent, categories, collectionProducts, collections, productImages, productVariants, products } from "@/db/schema";
import raw from "./data.json";

/**
 * Instantané du catalogue pour la vitrine statique (voir scripts/export-vitrine-data.ts).
 * Les dates, sérialisées en texte dans le JSON, sont reconverties.
 */

type Collection = typeof collections.$inferSelect;
export type VitrineProduct = typeof products.$inferSelect & {
  images: (typeof productImages.$inferSelect)[];
  variants: (typeof productVariants.$inferSelect)[];
  category: typeof categories.$inferSelect | null;
  collections: (typeof collectionProducts.$inferSelect & { collection: Collection })[];
};

type Snapshot = {
  generatedAt: string;
  settings: unknown;
  homepage: { id: string; type: string; published: HomepageSectionContent }[];
  categories: (typeof categories.$inferSelect)[];
  collections: Collection[];
  collectionProductIds: Record<string, string[]>;
  products: VitrineProduct[];
  popularIds: string[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function revive(value: unknown): unknown {
  if (typeof value === "string") return ISO_DATE.test(value) ? new Date(value) : value;
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, revive(v)]));
  return value;
}

export const snapshot = revive(raw) as Snapshot;
