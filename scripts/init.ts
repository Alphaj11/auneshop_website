/**
 * Initialisation d'une base neuve, SANS données de démonstration (utilisable en production) :
 * réglages par défaut et sections de la page d'accueil. Idempotent : ne modifie rien d'existant.
 *
 *   npm run db:init
 */
import { sql } from "drizzle-orm";
import type { HomepageSectionContent } from "../src/db/schema";
import { defaultSettings } from "../src/lib/settings-schema";
import { scriptDb } from "./db";

const sections: { type: "hero" | "promo_banner" | "featured_collection" | "featured_products" | "story" | "collections" | "selection" | "newsletter"; content: HomepageSectionContent }[] = [
  { type: "hero", content: { enabled: true, position: 0, title: "Avant d'être une marque, nous sommes un atelier.", subtitle: "", ctaLabel: "Explorer les collections", ctaHref: "/collections" } },
  { type: "promo_banner", content: { enabled: false, position: 1, title: "", ctaHref: "/livraison-retours" } },
  { type: "featured_collection", content: { enabled: true, position: 2, title: "", subtitle: "La collection à la une", body: "", collectionId: null, ctaLabel: "Entrer dans la collection" } },
  { type: "featured_products", content: { enabled: true, position: 3, title: "Pièces à la une", subtitle: "", productIds: [] } },
  { type: "story", content: { enabled: false, position: 4, title: "L'histoire d'un vêtement", subtitle: "", body: "" } },
  { type: "collections", content: { enabled: true, position: 5, title: "Les collections", subtitle: "" } },
  { type: "selection", content: { enabled: true, position: 6, title: "La sélection Aune", subtitle: "Nouveautés", mode: "new" } },
  { type: "newsletter", content: { enabled: true, position: 7, title: "Les lettres de l'atelier", subtitle: "" } },
];

async function main() {
  const { db, close, schema } = scriptDb();
  try {
    const settings = await db.insert(schema.storeSettings).values({ id: 1, data: defaultSettings }).onConflictDoNothing().returning({ id: schema.storeSettings.id });
    console.log(settings.length ? "Réglages par défaut créés." : "Réglages déjà présents : inchangés.");
    let added = 0;
    for (const s of sections) {
      const r = await db
        .insert(schema.homepageSections)
        .values({ type: s.type, published: s.content, draft: s.content })
        .onConflictDoNothing()
        .returning({ id: schema.homepageSections.id });
      added += r.length;
    }
    console.log(`${added} section(s) d'accueil créée(s).`);
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(sql`role <> 'customer'`);
    if (!n) console.log("Aucun administrateur : lancez  npm run admin:create -- --email vous@domaine.fr");
  } finally {
    await close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
