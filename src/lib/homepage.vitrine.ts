import "server-only";
import { snapshot } from "@/vitrine/store";

export type { HomeSection } from "./homepage.full";
import type { HomeSection } from "./homepage.full";

/** Sections publiées de la page d'accueil, lues dans l'instantané de la vitrine. */
export async function getHomepageSections(draft = false): Promise<HomeSection[]> {
  void draft;
  return snapshot.homepage
    .map((r) => ({ id: r.id, type: r.type, content: r.published }))
    .filter((s) => s.content.enabled)
    .sort((a, b) => a.content.position - b.content.position);
}
