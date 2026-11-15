/**
 * Construit la vitrine statique (GitHub Pages) dans out/ :
 *
 *   npm run build:vitrine                      (sous-dossier /auneshop_website par défaut)
 *   VITRINE_BASE_PATH= npm run build:vitrine   (à la racine d'un domaine)
 *
 * La construction a lieu dans une copie de travail (.vitrine-build/), jamais dans le projet :
 * 1. les pages qui exigent un serveur (admin, compte, panier, commande, API…) n'y sont pas copiées ;
 * 2. chaque fichier « x.vitrine.ts(x) » y remplace « x.ts(x) » (l'original devient « x.full.ts(x) ») :
 *    base de données, catalogue, réglages, session et actions lisent l'instantané src/vitrine/data.json ;
 * 3. `next build` exporte le site, puis les chemins des fichiers publics reçoivent le sous-dossier.
 * Aucun fichier .env n'est copié : la vitrine se construit sans base ni secret.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STAGE = path.join(ROOT, ".vitrine-build");
const OUT = path.join(ROOT, "out");
const BASE = process.env.VITRINE_BASE_PATH ?? "/auneshop_website";

const COPIED = ["src", "public", "next.config.ts", "tsconfig.json", "next-env.d.ts", "package.json"];
const EXCLUDED = [
  "src/app/admin",
  "src/app/api",
  "src/app/media",
  "src/app/sitemap.ts",
  "src/app/robots.ts",
  "src/proxy.ts",
  "src/components/admin",
  ...["commande", "compte", "connexion", "inscription", "mot-de-passe-oublie", "newsletter", "panier", "recherche", "reinitialiser"].map(
    (d) => `src/app/(boutique)/${d}`,
  ),
  // Vidéo sans licence, gardée en local uniquement.
  "public/demo/hero-main",
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function stage() {
  rmSync(STAGE, { recursive: true, force: true });
  for (const rel of COPIED) cpSync(path.join(ROOT, rel), path.join(STAGE, rel), { recursive: true });
  for (const rel of EXCLUDED) rmSync(path.join(STAGE, rel), { recursive: true, force: true });
  for (const file of walk(path.join(STAGE, "src")).filter((f) => /\.vitrine\.tsx?$/.test(f))) {
    const target = file.replace(".vitrine.", ".");
    if (existsSync(target)) renameSync(target, target.replace(/\.(tsx?)$/, ".full.$1"));
    renameSync(file, target);
  }
}

/** Ajoute le sous-dossier aux chemins des fichiers publics (images, vidéos, polices). */
function rebase(dir) {
  if (!BASE) return;
  const dirs = readdirSync(path.join(ROOT, "public")).filter((d) => statSync(path.join(ROOT, "public", d)).isDirectory());
  const re = new RegExp(`(["'(\`])/(${dirs.join("|")})/`, "g");
  for (const file of walk(dir).filter((f) => /\.(html|js|css|txt|json)$/.test(f))) {
    const src = readFileSync(file, "utf8");
    const next = src.replace(re, `$1${BASE}/$2/`);
    if (next !== src) writeFileSync(file, next);
  }
}

if (!existsSync(path.join(ROOT, "src/vitrine/data.json"))) {
  console.error("src/vitrine/data.json manquant : lancez d'abord npm run vitrine:data.");
  process.exit(1);
}
stage();
const env = {
  ...process.env,
  VITRINE_BUILD: "1",
  NEXT_PUBLIC_VITRINE: "1",
  NEXT_PUBLIC_BASE_PATH: BASE,
  APP_URL: process.env.APP_URL ?? `https://alphaj11.github.io${BASE}`,
};
delete env.DATABASE_URL;
const next = path.join(ROOT, "node_modules/next/dist/bin/next");
const status = spawnSync(process.execPath, [next, "build"], { cwd: STAGE, stdio: "inherit", env }).status ?? 1;
/**
 * Segments de préchargement : Next les écrit en sous-dossiers (__next.X/page/__PAGE__.txt) mais
 * les demande en un seul nom pointé (__next.X.page.__PAGE__.txt). Un hébergeur statique ne fait
 * pas la correspondance : on écrit aussi la version pointée.
 */
function flattenSegments(dir) {
  for (const file of walk(dir)) {
    const rel = path.relative(dir, file).split(path.sep);
    const i = rel.findIndex((part, k) => part.startsWith("__next.") && k < rel.length - 1);
    if (i === -1) continue;
    const flat = path.join(dir, ...rel.slice(0, i), rel.slice(i).join("."));
    if (!existsSync(flat)) cpSync(file, flat);
  }
}

if (status === 0) {
  rmSync(OUT, { recursive: true, force: true });
  renameSync(path.join(STAGE, "out"), OUT);
  rebase(OUT);
  flattenSegments(OUT);
  // GitHub Pages ignore sinon les dossiers commençant par « _ » (dont _next).
  writeFileSync(path.join(OUT, ".nojekyll"), "");
  console.log(`\nVitrine prête dans out/ (sous-dossier : ${BASE || "racine"}).`);
}
process.exit(status);
