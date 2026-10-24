import "server-only";
import { db } from "@/db";
import type { HomepageSectionContent } from "@/db/schema";

export type HomeSection = { id: string; type: string; content: HomepageSectionContent };

/** Sections de la page d'accueil, triées. `draft` = version brouillon (prévisualisation admin). */
export async function getHomepageSections(draft = false): Promise<HomeSection[]> {
  const rows = await db.query.homepageSections.findMany();
  return rows
    .map((r) => ({ id: r.id, type: r.type, content: draft ? r.draft : r.published }))
    .filter((s) => s.content.enabled)
    .sort((a, b) => a.content.position - b.content.position);
}
