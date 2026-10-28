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

## Vidéo de la page « L'atelier » (public/media/atelier/)

\`histoire-1080.mp4\`, \`histoire-720.mp4\` et \`histoire-poster.jpg\` sont montés avec
\`scripts/build-atelier-clip.mjs\` à partir de cinq vidéos Pexels, sous la
[licence Pexels](https://www.pexels.com/license/) (usage gratuit, y compris commercial, sans
attribution obligatoire, modification autorisée), et de la photo Unsplash \`hero.jpg\` ci-dessus :

| Acte | Sujet | Auteur | Source |
| --- | --- | --- | --- |
| 1. La matière | Tissu jaune en macro | StefWithAnF | https://www.pexels.com/video/5514239/ |
| 2. Le tissage | Métier à tisser traditionnel | Magda Ehlers | https://www.pexels.com/video/32655900/ |
| 3. Le geste | Mains qui cousent | Videogrammer .com | https://www.pexels.com/video/5815279/ |
| 4. La couture | Aiguille et fil | Marek Ruczaj | https://www.pexels.com/video/35166550/ |
| 5. Le vêtement | Robe blanche devant un mur de pierre (photo) | Alejandro Morelos (Unsplash) | https://unsplash.com/photos/2-P-dXuUYYM |
| 6. La lumière | Tissu blanc texturé | Nova lv | https://www.pexels.com/video/30104841/ |

Ces images ne montrent pas l'atelier d'Aune : à remplacer, idéalement, par un tournage dans
l'atelier (gros plans de fils, métier, mains, aiguille, pièce finie, fin claire).

## Vidéo de l'accueil, « L'histoire d'un vêtement » (public/media/voyage/)

\`voyage-1080.mp4\`, \`voyage-720.mp4\` et \`voyage-poster.jpg\` (preset « voyage » du même script),
montés à partir de vidéos Pexels sous la [licence Pexels](https://www.pexels.com/license/) :

| Plan | Sujet | Auteur | Source |
| --- | --- | --- | --- |
| 1. Le coton | Champ de coton sous un ciel clair | Lio Voo | https://www.pexels.com/video/13943183/ |
| 2. Le fil | Rouet traditionnel | Tawseef Ahmad | https://www.pexels.com/video/37523883/ |
| 3. La toile | Métier à tisser traditionnel | Magda Ehlers | https://www.pexels.com/video/32655900/ |
| 4. L'envol | Coucher de soleil par le hublot | Kelly | https://www.pexels.com/video/3740041/ |
| 5. Les nuages | Nuages vus du hublot | Jessica Bonafede | https://www.pexels.com/video/34467289/ |
| 6. L'arrivée | Femme en robe marchant en ville | Lê Cuộc | https://www.pexels.com/video/10394872/ |

Ces images n'ont pas été tournées pour Aune (ni en Inde pour toutes) : elles illustrent le voyage.
`,
);
console.log("Crédits écrits dans docs/CREDITS-PHOTOS.md");
