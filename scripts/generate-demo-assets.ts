/**
 * Génère les visuels de DÉMONSTRATION dans public/demo/.
 * Illustrations vectorielles originales (aucune image externe ni protégée).
 *
 *   npm run demo:assets
 *
 * Pour les remplacer par de vraies photos : voir docs/IMAGES.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { garmentSvg, garments, mannequinSvg, shade, type Palette } from "../src/lib/garments";
import { collections, colorSlug, products, type DemoColor } from "./demo-catalog";

const OUT = path.resolve("public/demo");
const write = (rel: string, svg: string) => {
  const file = path.join(OUT, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, svg.replace(/\n\s+/g, "\n").trim());
};

const palette = (c: DemoColor): Palette => ({ primary: c.hex, secondary: c.secondary, stripes: c.stripes });

/** Grain photographique léger. */
const grain = (id: string) => `
  <filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .07 0"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>`;

/** Photo « éditoriale » : mannequin habillé dans un décor de studio. */
function editorial(c: DemoColor, type: (typeof products)[number]["type"], backdrop: string, id: string) {
  const floor = shade(backdrop, -0.1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(backdrop, 0.12)}"/><stop offset=".78" stop-color="${backdrop}"/>
      <stop offset=".78" stop-color="${floor}"/><stop offset="1" stop-color="${shade(floor, -0.06)}"/>
    </linearGradient>
    <radialGradient id="light" cx=".35" cy=".25" r=".7">
      <stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    ${grain("grain")}
  </defs>
  <rect width="800" height="1000" fill="url(#wall)"/>
  <rect width="800" height="1000" fill="url(#light)"/>
  <ellipse cx="400" cy="955" rx="150" ry="22" fill="url(#shadow)"/>
  <g transform="translate(220 10) scale(0.9 0.95)">${mannequinSvg(undefined, { type, palette: palette(c), id })}</g>
  <rect width="800" height="1000" filter="url(#grain)"/>
</svg>`;
}

/** Vêtement détouré seul, fond transparent (scène orbitale, vignettes). */
function cutout(c: DemoColor, type: (typeof products)[number]["type"], id: string) {
  const [x, y, w, h] = garments[type].crop;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}">
  <defs><filter id="ds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-opacity=".18"/></filter></defs>
  <g filter="url(#ds)">${garmentSvg(type, palette(c), id)}</g>
</svg>`;
}

/** Mannequin portant le vêtement, fond transparent. */
function worn(c: DemoColor, type: (typeof products)[number]["type"], id: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 1000">${mannequinSvg(undefined, { type, palette: palette(c), id })}</svg>`;
}

/** Gros plan sur la trame du tissu. */
function detail(c: DemoColor) {
  const base = c.hex;
  const warp = shade(base, -0.12);
  const weft = shade(base, 0.08);
  let threads = "";
  for (let y = 0; y < 1000; y += 20) {
    for (let x = 0; x < 800; x += 20) {
      const over = ((x + y) / 20) % 2 === 0;
      threads += over
        ? `<rect x="${x + 1}" y="${y + 4}" width="18" height="12" rx="6" fill="${weft}"/>`
        : `<rect x="${x + 4}" y="${y + 1}" width="12" height="18" rx="6" fill="${warp}"/>`;
    }
  }
  const stitch = shade(base, luminanceSafe(base) ? -0.45 : 0.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <defs>
    <radialGradient id="v" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
    ${grain("grain")}
  </defs>
  <rect width="800" height="1000" fill="${base}"/>
  <g transform="rotate(-8 400 500) translate(-60 -60) scale(1.15)">${threads}</g>
  <path d="M-20 640 C200 600 520 700 820 620" stroke="${shade(base, -0.25)}" stroke-width="22" fill="none" opacity=".35"/>
  <path d="M-20 640 C200 600 520 700 820 620" stroke="${stitch}" stroke-width="4" stroke-dasharray="22 14" fill="none"/>
  <circle cx="560" cy="380" r="46" fill="${shade(base, 0.3)}" stroke="${shade(base, -0.3)}" stroke-width="3"/>
  <circle cx="545" cy="368" r="6" fill="${shade(base, -0.35)}"/><circle cx="575" cy="368" r="6" fill="${shade(base, -0.35)}"/>
  <circle cx="545" cy="394" r="6" fill="${shade(base, -0.35)}"/><circle cx="575" cy="394" r="6" fill="${shade(base, -0.35)}"/>
  <rect width="800" height="1000" fill="url(#v)"/>
  <rect width="800" height="1000" filter="url(#grain)"/>
</svg>`;
}

function luminanceSafe(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255 > 0.5;
}

// --- Produits --------------------------------------------------------------

const backdropFor = (slug: string) => collections.find((c) => c.products.includes(slug))?.backdrop ?? "#DCD3C4";

let n = 0;
for (const p of products) {
  const bd = backdropFor(p.slug);
  p.colors.forEach((c, i) => {
    const cs = colorSlug(c.name);
    write(`products/${p.slug}/${cs}-editorial.svg`, editorial(c, p.type, i % 2 ? shade(bd, 0.15) : bd, `e${n++}`));
    write(`products/${p.slug}/${cs}-cutout.svg`, cutout(c, p.type, `c${n++}`));
    write(`products/${p.slug}/${cs}-worn.svg`, worn(c, p.type, `w${n++}`));
    if (i === 0) write(`products/${p.slug}/${cs}-detail.svg`, detail(c));
  });
}

// --- Couvertures de collections -------------------------------------------

for (const col of collections) {
  const picks = col.products.slice(0, 3).map((slug) => products.find((p) => p.slug === slug)!);
  const figures = picks
    .map((p, i) => {
      const x = [430, 120, 740][i];
      const s = i === 0 ? 0.92 : 0.78;
      const y = i === 0 ? 40 : 150;
      return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${i === 0 ? 1 : 0.92}">${mannequinSvg(undefined, {
        type: p.type,
        palette: palette(p.colors[0]),
        id: `cv${col.slug}${i}`,
      })}</g>`;
    })
    .reverse()
    .join("");
  write(
    `collections/${col.slug}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1000">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(col.backdrop, 0.1)}"/><stop offset=".8" stop-color="${col.backdrop}"/><stop offset=".8" stop-color="${shade(col.backdrop, -0.1)}"/><stop offset="1" stop-color="${shade(col.backdrop, -0.16)}"/></linearGradient>
    <radialGradient id="sh"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    ${grain("grain")}
  </defs>
  <rect width="1200" height="1000" fill="url(#wall)"/>
  <circle cx="600" cy="420" r="330" fill="${col.accent}" opacity=".16"/>
  <ellipse cx="610" cy="965" rx="420" ry="26" fill="url(#sh)"/>
  ${figures}
  <rect width="1200" height="1000" filter="url(#grain)"/>
</svg>`,
  );
}

// --- Récit « de la matière au vêtement » -----------------------------------

const story = {
  fibre: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <defs>${grain("grain")}<radialGradient id="g" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#F6F1E7"/><stop offset="1" stop-color="#D9CDB8"/></radialGradient></defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <path d="M400 1000 C396 860 404 760 400 640" stroke="#6B5A43" stroke-width="10" fill="none"/>
  <path d="M400 760 C440 720 480 700 520 690" stroke="#6B5A43" stroke-width="6" fill="none"/>
  <path d="M310 600 C330 650 470 650 490 600 C470 610 330 610 310 600Z" fill="#6B5A43"/>
  ${Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2;
    const r = 110 + (i % 3) * 18;
    return `<ellipse cx="${400 + Math.cos(a) * r * 0.6}" cy="${470 + Math.sin(a) * r * 0.55}" rx="${70 + (i % 4) * 8}" ry="${60 + (i % 5) * 6}" fill="#FBF8F2" opacity=".9"/>`;
  }).join("")}
  <ellipse cx="400" cy="470" rx="120" ry="110" fill="#fff"/>
  ${Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return `<path d="M${400 + Math.cos(a) * 150} ${470 + Math.sin(a) * 130} q ${Math.cos(a + 1) * 60} ${Math.sin(a + 1) * 60} ${Math.cos(a) * 90} ${Math.sin(a) * 80}" stroke="#F2EBDD" stroke-width="2" fill="none" opacity=".8"/>`;
  }).join("")}
  <rect width="800" height="1000" filter="url(#grain)"/>
</svg>`,
  fil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <defs>${grain("grain")}</defs>
  <rect width="800" height="1000" fill="#D9C3AE"/>
  <rect x="300" y="250" width="200" height="40" rx="8" fill="#8A6A4A"/>
  <rect x="300" y="690" width="200" height="40" rx="8" fill="#8A6A4A"/>
  <rect x="330" y="290" width="140" height="400" fill="#B5562F"/>
  ${Array.from({ length: 50 }, (_, i) => `<path d="M330 ${296 + i * 8} L470 ${292 + i * 8}" stroke="${i % 2 ? "#9C4626" : "#C9673F"}" stroke-width="5"/>`).join("")}
  <path d="M470 520 C600 540 640 700 560 820 C500 900 300 900 180 960" stroke="#B5562F" stroke-width="5" fill="none"/>
  <rect width="800" height="1000" filter="url(#grain)"/>
</svg>`,
  tissage: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <defs>${grain("grain")}</defs>
  <rect width="800" height="1000" fill="#2F4A3A"/>
  ${Array.from({ length: 34 }, (_, i) => `<rect x="${40 + i * 21}" y="0" width="8" height="1000" fill="#E9E0CC" opacity=".85"/>`).join("")}
  ${Array.from({ length: 26 }, (_, j) =>
    Array.from({ length: 34 }, (_, i) =>
      (i + j) % 2 === 0 ? `<rect x="${32 + i * 21}" y="${560 + j * 16}" width="24" height="10" rx="4" fill="#B5562F"/>` : "",
    ).join(""),
  ).join("")}
  <rect x="20" y="520" width="760" height="22" rx="4" fill="#7A5A3A"/>
  <path d="M120 500 L680 500" stroke="#B5562F" stroke-width="10" stroke-linecap="round"/>
  <rect width="800" height="1000" filter="url(#grain)"/>
</svg>`,
  vetement: editorial({ name: "Terre cuite", hex: "#B5562F" }, "dress", "#E4D3C0", "story"),
};
for (const [k, svg] of Object.entries(story)) write(`story/${k}.svg`, svg);

// --- Visuel principal de la page d'accueil ---------------------------------

write(
  "hero.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9DCCB"/><stop offset="1" stop-color="#CFB79D"/></linearGradient>
    <radialGradient id="sh"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    ${grain("grain")}
  </defs>
  <rect width="1600" height="1000" fill="url(#wall)"/>
  <path d="M0 780 L1600 760 L1600 1000 L0 1000Z" fill="#C3A988" opacity=".55"/>
  ${Array.from({ length: 14 }, (_, i) => `<path d="M${-100 + i * 40} ${-50} C ${400 + i * 30} ${300 + i * 12}, ${700 - i * 20} ${520 + i * 6}, ${1700} ${200 + i * 50}" stroke="${i % 3 === 0 ? "#B5562F" : i % 3 === 1 ? "#2F4A3A" : "#F5EFE4"}" stroke-width="${i % 4 === 0 ? 2.5 : 1.2}" fill="none" opacity=".55"/>`).join("")}
  <ellipse cx="1080" cy="968" rx="220" ry="24" fill="url(#sh)"/>
  <g transform="translate(880 0) scale(1 0.98)">${mannequinSvg(undefined, { type: "dress", palette: { primary: "#B5562F", secondary: "#EDE6D6" }, id: "hero" })}</g>
  <rect width="1600" height="1000" filter="url(#grain)"/>
</svg>`,
);

// --- Mannequin seul (scène orbitale quand aucun vêtement n'est sélectionné) --

write("mannequin.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 1000">${mannequinSvg()}</svg>`);

console.log(`Visuels de démonstration générés dans ${OUT}`);
