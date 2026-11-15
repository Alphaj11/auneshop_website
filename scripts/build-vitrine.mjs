#!/usr/bin/env node
/**
 * Vitrine statique pour GitHub Pages.
 *
 * Le site complet a besoin d'un serveur et d'une base (panier, comptes, admin). La vitrine
 * en est une photographie : on construit le site en mode NEXT_PUBLIC_VITRINE=1 (commande,
 * comptes et formulaires désactivés côté client), on le lance, on parcourt les pages
 * publiques, et on enregistre le HTML rendu avec les fichiers statiques dans out/.
 *
 * Prérequis : une base peuplée (npm run db:migrate && npm run db:seed) et les variables
 * habituelles (DATABASE_URL, SESSION_SECRET).
 *
 *   npm run build:vitrine                       # sous-dossier /auneshop_website par défaut
 *   VITRINE_BASE_PATH="" npm run build:vitrine  # à la racine d'un domaine
 */
import { spawn, execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";

const BASE = process.env.VITRINE_BASE_PATH ?? "/auneshop_website";
const PORT = Number(process.env.VITRINE_PORT ?? 4310);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const OUT = "out";

/** Pages qui n'ont pas de sens sans serveur : jamais publiées dans la vitrine. */
const EXCLUDED = ["/admin", "/compte", "/connexion", "/inscription", "/panier", "/commande", "/recherche", "/mot-de-passe-oublie", "/reinitialiser", "/newsletter", "/api", "/media"];
/** Points de départ du parcours, en plus des liens trouvés dans les pages. */
const SEEDS = ["/", "/collections", "/boutique", "/femme", "/homme", "/atelier", "/le-projet", "/contact", "/faq", "/livraison-retours", "/cgv", "/mentions-legales", "/confidentialite", "/cookies"];
/** Dossiers de public/ référencés par des chemins absolus qu'il faut préfixer par le sous-dossier. */
const PUBLIC_DIRS = ["demo", "brand", "fonts", "media"];

const env = { ...process.env, NEXT_PUBLIC_VITRINE: "1", NEXT_PUBLIC_BASE_PATH: BASE, NODE_ENV: "production" };

console.log(`› Build Next.js (vitrine, sous-dossier « ${BASE || "/"} »)`);
execSync("npx next build", { stdio: "inherit", env });

console.log("› Démarrage du serveur");
const server = spawn("npx", ["next", "start", "-p", String(PORT), "-H", "127.0.0.1"], { env, stdio: ["ignore", "inherit", "inherit"], detached: true });
const stop = () => {
  try {
    process.kill(-server.pid);
  } catch {}
};
process.on("exit", stop);

try {
  await waitFor(`${ORIGIN}${BASE}/`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  console.log("› Parcours des pages");
  const pages = await crawl();
  console.log(`  ${pages} pages enregistrées`);

  // Page 404 : n'importe quelle adresse inconnue rend la page « introuvable » du site.
  const nf = await fetch(`${ORIGIN}${BASE}/__vitrine-404__/`);
  writeFileSync(join(OUT, "404.html"), await nf.text());

  console.log("› Fichiers statiques");
  cpSync(".next/static", join(OUT, "_next/static"), { recursive: true });
  for (const entry of readdirSync("public")) cpSync(join("public", entry), join(OUT, entry), { recursive: true });

  if (BASE) {
    console.log("› Préfixage des chemins absolus");
    const re = new RegExp(`([\"'\`(\\s,=])/(${PUBLIC_DIRS.join("|")})/`, "g");
    let files = 0;
    for (const file of walk(OUT)) {
      if (![".html", ".js", ".css"].includes(extname(file))) continue;
      const src = readFileSync(file, "utf8");
      const next = src.replace(re, `$1${BASE}/$2/`);
      if (next !== src) {
        writeFileSync(file, next);
        files++;
      }
    }
    console.log(`  ${files} fichiers modifiés`);
  }

  // GitHub Pages passe par Jekyll, qui ignore les dossiers commençant par « _ » (dont _next).
  writeFileSync(join(OUT, ".nojekyll"), "");
  console.log(`✓ Vitrine prête dans ${OUT}/`);
} finally {
  stop();
}

async function crawl() {
  const queue = SEEDS.map((p) => normalize(BASE + p)).filter(Boolean);
  const seen = new Set(queue);
  const assets = new Set();
  let saved = 0;
  while (queue.length) {
    const path = queue.shift();
    const res = await fetch(ORIGIN + path, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const to = normalize(new URL(res.headers.get("location"), ORIGIN + path).pathname);
      if (to && !seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
      continue;
    }
    if (!res.ok) {
      console.warn(`  ! ${res.status} ${path}`);
      continue;
    }
    const html = await res.text();
    const file = join(OUT, path.slice(BASE.length), "index.html");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
    saved++;
    for (const [, url] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      const clean = url.replace(/&amp;/g, "&").split("?")[0];
      if (!clean.startsWith(BASE + "/") || clean.startsWith(BASE + "/_next/")) continue;
      if (extname(clean)) {
        assets.add(clean);
        continue;
      }
      const page = normalize(clean);
      if (page && !seen.has(page)) {
        seen.add(page);
        queue.push(page);
      }
    }
  }
  // Fichiers servis par des routes (icônes, robots, plan du site) et absents de public/.
  for (const asset of [...assets, `${BASE}/robots.txt`, `${BASE}/sitemap.xml`]) {
    const rel = asset.slice(BASE.length);
    if (existsSync(join("public", rel))) continue;
    const res = await fetch(ORIGIN + asset);
    if (!res.ok) continue;
    const file = join(OUT, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return saved;
}

/** Chemin de page publiable, avec la barre finale, ou null s'il est exclu. */
function normalize(path) {
  const rel = path.slice(BASE.length) || "/";
  if (EXCLUDED.some((p) => rel === p || rel.startsWith(p + "/"))) return null;
  return BASE + (rel.endsWith("/") ? rel : rel + "/");
}

async function waitFor(url) {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Le serveur ne répond pas sur ${url}`);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}
