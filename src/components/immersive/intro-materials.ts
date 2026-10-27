/**
 * Matières de l'introduction : toile de lin tissée, aiguille en acier, fil retors.
 *
 * Tout est généré au chargement (aucune image externe) : la toile est tissée fil
 * à fil dans un canevas hors écran (armure toile, flammes du lin, duvet, grain),
 * puis réutilisée comme motif. Les ombres douces sont obtenues en dessinant à
 * basse résolution puis en agrandissant (flou naturel, compatible tous navigateurs).
 */

export type RGB = [number, number, number];

export const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
export const rgba = ([r, g, b]: RGB, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
export const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function offscreen(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

const SHADOW: RGB = [28, 12, 6];
const LIGHT: RGB = [255, 247, 234];

/**
 * Toile de lin en armure toile, raccordable (motif répété).
 * `pitch` = écart entre deux fils, en pixels de la texture.
 */
export function linenTexture(baseHex: string, size = 512, pitch = 8, seed = 11) {
  const r = rng(seed);
  const base = hex(baseHex);
  const dark = mix(base, SHADOW, 0.42);
  const light = mix(base, LIGHT, 0.28);
  const c = offscreen(size, size);
  const g = c.getContext("2d")!;
  g.fillStyle = rgba(mix(base, dark, 0.7));
  g.fillRect(0, 0, size, size);

  const n = Math.round(size / pitch);
  // Chaque fil a son ton et ses « flammes » (épaississements typiques du lin).
  const thread = () => {
    const prof = Array.from({ length: n }, () => 1);
    for (let k = 0; k < 3; k++) {
      const at = Math.floor(r() * n);
      const len = 2 + Math.floor(r() * 6);
      const amp = 0.12 + r() * 0.3;
      for (let j = 0; j < len; j++) prof[(at + j) % n] += amp * Math.sin((Math.PI * (j + 0.5)) / len);
    }
    return { tone: (r() - 0.5) * 0.7, prof, w: 0.8 + r() * 0.16 };
  };
  const warp = Array.from({ length: n }, thread);
  const weft = Array.from({ length: n }, thread);
  const toned = (t: number) => (t >= 0 ? mix(base, light, t) : mix(base, dark, -t));

  const capsule = (x: number, y: number, len: number, wid: number, vertical: boolean, col: RGB) => {
    const h = wid / 2;
    const gr = vertical ? g.createLinearGradient(x - h, 0, x + h, 0) : g.createLinearGradient(0, y - h, 0, y + h);
    gr.addColorStop(0, rgba(mix(col, dark, 0.5)));
    gr.addColorStop(0.35, rgba(mix(col, light, 0.22)));
    gr.addColorStop(0.6, rgba(col));
    gr.addColorStop(1, rgba(mix(col, dark, 0.6)));
    g.fillStyle = gr;
    g.beginPath();
    if (vertical) g.roundRect(x - h, y - len / 2, wid, len, h);
    else g.roundRect(x - len / 2, y - h, len, wid, h);
    g.fill();
  };

  for (let j = -1; j <= n; j++) {
    for (let i = -1; i <= n; i++) {
      const ii = (i + n) % n;
      const jj = (j + n) % n;
      const cx = i * pitch + pitch / 2;
      const cy = j * pitch + pitch / 2;
      const wa = warp[ii];
      const we = weft[jj];
      const warpW = Math.min(pitch * 1.05, pitch * wa.w * wa.prof[jj]);
      const weftW = Math.min(pitch * 1.05, pitch * we.w * we.prof[ii]);
      const wc = toned(wa.tone);
      const fc = toned(we.tone);
      if ((ii + jj) % 2 === 0) {
        capsule(cx, cy, pitch * 0.9, weftW * 0.8, false, mix(fc, dark, 0.4));
        capsule(cx, cy, pitch * 1.3, warpW, true, wc);
      } else {
        capsule(cx, cy, pitch * 0.9, warpW * 0.8, true, mix(wc, dark, 0.4));
        capsule(cx, cy, pitch * 1.3, weftW, false, fc);
      }
    }
  }

  // Duvet : fibres libres à la surface de la toile.
  g.lineCap = "round";
  for (let k = 0; k < size * 0.5; k++) {
    const x = r() * size;
    const y = r() * size;
    const a = r() * Math.PI * 2;
    const l = pitch * (0.8 + r() * 3.5);
    const bend = (r() - 0.5) * l;
    g.strokeStyle = rgba(r() > 0.3 ? light : mix(base, LIGHT, 0.6), 0.12 + r() * 0.22);
    g.lineWidth = 0.35 + r() * 0.35;
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        g.beginPath();
        g.moveTo(x + dx, y + dy);
        g.quadraticCurveTo(
          x + dx + Math.cos(a) * l * 0.5 - Math.sin(a) * bend,
          y + dy + Math.sin(a) * l * 0.5 + Math.cos(a) * bend,
          x + dx + Math.cos(a) * l,
          y + dy + Math.sin(a) * l,
        );
        g.stroke();
      }
    }
  }

  // Grain fin.
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let p = 0; p < d.length; p += 4) {
    const v = (r() - 0.5) * 16;
    d[p] += v;
    d[p + 1] += v;
    d[p + 2] += v;
  }
  g.putImageData(img, 0, 0);

  return { canvas: c, average: rgba(mix(base, dark, 0.25)), pitch };
}

/**
 * Aiguille à coudre en acier, dessinée le long de l'axe x (chas en 0, pointe en `len`).
 * À appeler après avoir placé le repère (translate/rotate).
 */
export function drawNeedle(g: CanvasRenderingContext2D, len: number, shadowPx: number) {
  const w = len * 0.034;
  const h = w / 2;
  const body = new Path2D();
  body.moveTo(0, -h);
  body.lineTo(len * 0.76, -h * 0.92);
  body.quadraticCurveTo(len * 0.93, -h * 0.4, len, 0);
  body.quadraticCurveTo(len * 0.93, h * 0.4, len * 0.76, h * 0.92);
  body.lineTo(0, h);
  body.arc(0, 0, h, Math.PI / 2, -Math.PI / 2);
  body.closePath();

  // Ombre portée sur la toile.
  g.save();
  g.shadowColor = "rgba(30,14,6,.42)";
  g.shadowBlur = shadowPx * 1.6;
  g.shadowOffsetX = shadowPx * 0.7;
  g.shadowOffsetY = shadowPx * 1.1;
  g.fillStyle = "#6c7176";
  g.fill(body);
  g.restore();

  // Acier poli : reflet net sur l'arête supérieure.
  const steel = g.createLinearGradient(0, -h, 0, h);
  steel.addColorStop(0, "#565b60");
  steel.addColorStop(0.22, "#c4c9cd");
  steel.addColorStop(0.36, "#ffffff");
  steel.addColorStop(0.5, "#d9dde0");
  steel.addColorStop(0.72, "#8d9398");
  steel.addColorStop(1, "#3a3e42");
  g.fillStyle = steel;
  g.fill(body);

  // Reflets le long de la tige.
  const glint = g.createLinearGradient(0, 0, len, 0);
  glint.addColorStop(0, "rgba(255,255,255,0)");
  glint.addColorStop(0.45, "rgba(255,255,255,.35)");
  glint.addColorStop(0.6, "rgba(255,255,255,0)");
  glint.addColorStop(0.9, "rgba(255,255,255,.25)");
  glint.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glint;
  g.fill(body);

  // Chas.
  const ex = w * 1.1;
  const el = len * 0.075;
  g.beginPath();
  g.roundRect(ex, -h * 0.34, el, h * 0.68, h * 0.34);
  g.fillStyle = "rgba(40,22,14,.75)";
  g.fill();
  g.strokeStyle = "rgba(255,255,255,.45)";
  g.lineWidth = Math.max(0.3, w * 0.08);
  g.stroke();
  return { eyeX: ex + el * 0.5 };
}

/** Fil retors : ombre, âme, puis torsion des brins. `pts` en coordonnées courantes. */
export function drawThread(
  g: CanvasRenderingContext2D,
  pts: [number, number][],
  width: number,
  color: RGB,
  alpha = 1,
) {
  if (pts.length < 2) return;
  const line = () => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  };
  g.lineCap = "round";
  g.lineJoin = "round";
  g.save();
  g.translate(width * 0.55, width * 0.85);
  line();
  g.strokeStyle = rgba(SHADOW, 0.28 * alpha);
  g.lineWidth = width * 1.15;
  g.stroke();
  g.restore();
  line();
  g.strokeStyle = rgba(mix(color, SHADOW, 0.22), alpha);
  g.lineWidth = width;
  g.stroke();
  line();
  g.strokeStyle = rgba(mix(color, LIGHT, 0.2), 0.55 * alpha);
  g.lineWidth = width * 0.45;
  g.stroke();

  // Torsion : petits traits obliques réguliers.
  g.strokeStyle = rgba(mix(color, SHADOW, 0.45), 0.55 * alpha);
  g.lineWidth = width * 0.22;
  const step = width * 1.25;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const seg = Math.hypot(dx, dy);
    if (!seg) continue;
    const tx = dx / seg;
    const ty = dy / seg;
    while (acc <= seg) {
      const x = x0 + tx * acc;
      const y = y0 + ty * acc;
      const nx = -ty * width * 0.48;
      const ny = tx * width * 0.48;
      g.beginPath();
      g.moveTo(x - nx - tx * width * 0.35, y - ny - ty * width * 0.35);
      g.lineTo(x + nx + tx * width * 0.35, y + ny + ty * width * 0.35);
      g.stroke();
      acc += step;
    }
    acc -= seg;
  }
}

/** Courbe de Bézier quadratique échantillonnée. */
export function quad(a: [number, number], c: [number, number], b: [number, number], n = 24) {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}
