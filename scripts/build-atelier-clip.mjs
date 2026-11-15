/**
 * Monte les clips pilotés par le scroll avec ffmpeg.
 *
 *   node scripts/build-atelier-clip.mjs <dossier des clips sources> [atelier|voyage]
 *
 * - atelier : page « L'atelier », « Chaque fil a son histoire » (public/media/atelier/histoire-*).
 * - voyage : accueil, « L'histoire d'un vêtement », du champ de coton en Inde au vêtement porté,
 *   en passant par un vol (public/media/voyage/voyage-*).
 *
 * Sources : vidéos Pexels (licence Pexels, usage commercial gratuit) nommées <id>.mp4 dans le
 * dossier donné (téléchargées depuis https://www.pexels.com/download/video/<id>/), et une photo
 * Unsplash pour l'atelier. Crédits : docs/CREDITS-PHOTOS.md.
 *
 * Les clips sont muets, en 24 i/s, avec une image clé toutes les 2 images pour que le scroll
 * puisse viser n'importe quel instant sans à-coup. La fin s'éclaircit jusqu'à la couleur
 * du papier du site (#E6DAC7) : la transition vers la section suivante est dans l'image.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const SRC = process.argv[2];
if (!SRC) throw new Error("Indiquez le dossier des clips sources.");
const PRESET = process.argv[3] ?? "atelier";

/**
 * Un plan par acte : source, début (s), durée (s), recadrage progressif (zoom de départ → zoom
 * d'arrivée) et point visé (fx, fy : 0 = gauche/haut, 0,5 = centre, 1 = droite/bas).
 */
const PRESETS = {
  atelier: {
    dir: "public/media/atelier",
    name: "histoire",
    shots: [
      { id: "5514239", start: 0, dur: 1.7, zoom: [1.6, 1.0] }, // 1. la matière brute : la caméra prend de la hauteur
      { id: "32655900", start: 2.0, dur: 1.5, zoom: [1.15, 1.0] }, // 2. le tissage
      { id: "5815279", start: 7.6, dur: 1.5, zoom: [1.0, 1.1] }, // 3. le geste humain
      { id: "35166550", start: 9.5, dur: 1.5, zoom: [1.15, 1.0], fx: 0.6 }, // 4. l'aiguille et le fil
      // 5. le vêtement prend forme : photo fixe (Unsplash, robe blanche devant un mur de pierre), la caméra recule.
      { image: "public/demo/photos/hero.jpg", dur: 1.7, zoom: [1.35, 1.0], fy: 0.55 },
      { id: "30104841", start: 0.5, dur: 1.5, zoom: [1.0, 1.3] }, // 6. la matière s'efface vers la lumière
    ],
  },
  voyage: {
    dir: "public/media/voyage",
    name: "voyage",
    shots: [
      { id: "13943183", start: 2.0, dur: 1.6, zoom: [1.3, 1.0], fy: 0.6 }, // 1. le champ de coton
      { id: "37523883", start: 4.5, dur: 1.5, zoom: [1.0, 1.15] }, // 2. le filage au rouet
      { id: "32655900", start: 4.0, dur: 1.4, zoom: [1.1, 1.0] }, // 3. le tissage
      { id: "3740041", start: 4.2, dur: 2.0, zoom: [1.0, 1.45], fx: 0.55 }, // 4. l'envol : la caméra entre dans le hublot
      { id: "34467289", start: 6.0, dur: 1.5, zoom: [1.0, 1.15], fy: 0.55 }, // 5. au-dessus des nuages
      { id: "10394872", start: 0.4, dur: 1.9, zoom: [1.15, 1.0], fx: 0.55 }, // 6. l'arrivée : le vêtement porté
    ],
  },
};
const { dir, name, shots: SHOTS } = PRESETS[PRESET];
const OUT = path.resolve(dir);
mkdirSync(OUT, { recursive: true });
const XFADE = 0.35;
const PAPER = "0xE6DAC7";

const inputs = SHOTS.flatMap((s) =>
  s.image
    ? ["-loop", "1", "-framerate", "24", "-t", String(s.dur), "-i", path.resolve(s.image)]
    : ["-ss", String(s.start), "-t", String(s.dur), "-i", path.join(SRC, `${s.id}.mp4`)],
);

// Chaque plan : 24 i/s, recadrage progressif centré, étalonnage chaud et doux commun à tous.
const chains = SHOTS.map((s, i) => {
  const [z0, z1] = s.zoom;
  const z = `(${z0}+(${z1}-${z0})*t/${s.dur})`;
  return (
    // Le cadre a une taille fixe : on agrandit l'image image par image, puis on recadre au point visé.
    `[${i}:v]fps=24,scale=2304:1296:force_original_aspect_ratio=increase,crop=2304:1296,` +
    `scale=w='trunc(2304*${z}/2)*2':h='trunc(1296*${z}/2)*2':eval=frame,` +
    `crop=2304:1296:x='(iw-ow)*${s.fx ?? 0.5}':y='(ih-oh)*${s.fy ?? 0.5}',scale=1920:1080,setsar=1,` +
    `eq=saturation=0.86:contrast=1.02:gamma=1.03,colorbalance=rm=0.03:gm=0.01:bm=-0.04,format=yuv420p,settb=AVTB[v${i}]`
  );
});

// Fondus enchaînés, puis la fin qui s'éclaircit vers la couleur papier.
let graph = chains.join(";");
let last = "v0";
let offset = SHOTS[0].dur - XFADE;
for (let i = 1; i < SHOTS.length; i++) {
  const out = `x${i}`;
  graph += `;[${last}][v${i}]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}[${out}]`;
  last = out;
  offset += SHOTS[i].dur - XFADE;
}
const total = offset + XFADE;
graph += `;[${last}]fade=t=out:st=${(total - 0.9).toFixed(3)}:d=0.9:color=${PAPER}[final]`;

const encode = (height, file, crf) =>
  execFileSync(
    "ffmpeg",
    [
      "-y",
      ...inputs,
      "-filter_complex",
      `${graph};[final]scale=-2:${height}[out]`,
      "-map",
      "[out]",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      String(crf),
      "-g",
      "2",
      "-keyint_min",
      "2",
      "-bf",
      "0",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      path.join(OUT, file),
    ],
    { stdio: "inherit" },
  );

encode(1080, `${name}-1080.mp4`, 25);
encode(720, `${name}-720.mp4`, 27);
execFileSync("ffmpeg", ["-y", "-i", path.join(OUT, `${name}-1080.mp4`), "-frames:v", "1", "-update", "1", "-q:v", "3", path.join(OUT, `${name}-poster.jpg`)], {
  stdio: "inherit",
});
console.log(`Clip monté : ${total.toFixed(2)} s → ${OUT}`);
