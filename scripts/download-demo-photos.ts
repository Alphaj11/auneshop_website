/**
 * Télécharge les photos d'illustration (Unsplash) dans public/demo/photos/
 * et régénère docs/CREDITS-PHOTOS.md.
 *
 *   npm run demo:photos
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pagePhotos, productPhotos, type DemoPhoto } from "./demo-photos";

const OUT = path.resolve("public/demo/photos");
mkdirSync(OUT, { recursive: true });

const all: [string, DemoPhoto][] = [...Object.entries(productPhotos), ...Object.entries(pagePhotos)];

async function download() {
  for (const [key, p] of all) {
    const file = path.join(OUT, p.file);
    if (existsSync(file)) continue;
    const res = await fetch(`https://images.unsplash.com/photo-${p.photo}?w=1600&q=80&fm=jpg&fit=max`);
    if (!res.ok) throw new Error(`${key} : téléchargement impossible (${res.status})`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`✓ ${p.file}`);
  }
}

download().catch((e) => {
  console.error(e);
  process.exit(1);
});

const rows = all
  .map(([key, p]) => `| ${key} | \`${p.file}\` | ${p.subject} | ${p.author} | https://unsplash.com/photos/${p.page} |`)
  .join("\n");
writeFileSync(
  path.resolve("docs/CREDITS-PHOTOS.md"),
  `# Crédits des photos d'illustration

Ces photos servent uniquement à la démonstration du site. Elles montrent des vêtements
choisis pour leur proximité avec l'esprit Aune, mais **ce ne sont pas des pièces Aune** :
elles sont à remplacer par les photos de la marque avant toute mise en ligne.

Toutes sont publiées sur Unsplash sous la [licence Unsplash](https://unsplash.com/license) :
usage gratuit, y compris commercial, sans autorisation à demander. La licence interdit de
revendre les photos telles quelles et de laisser croire qu'une personne photographiée ou
une marque cautionne le produit. Sur le site, les fiches restent marquées « Exemple ».

| Usage | Fichier (public/demo/photos/) | Sujet | Auteur | Source |
| --- | --- | --- | --- | --- |
${rows}
`,
);
console.log("Crédits écrits dans docs/CREDITS-PHOTOS.md");
