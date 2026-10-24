/**
 * Géométrie des vêtements et du mannequin de démonstration.
 *
 * Toutes les formes partagent le même repère (viewBox 0 0 400 1000) pour que
 * chaque vêtement se superpose exactement au mannequin. Ce module est pur
 * (sans dépendance serveur) : il sert au script de génération des visuels de
 * démonstration ET à l'animation d'introduction côté navigateur.
 *
 * Ces visuels sont des illustrations provisoires, destinées à être remplacées
 * par les vraies photographies de la marque.
 */

export type GarmentType = "tshirt" | "top" | "shirt" | "jacket" | "dress" | "trousers" | "skirt" | "tote";

type Pt = [number, number];
type Seg = [Pt, Pt, Pt]; // c1, c2, fin

const W = 400;
const mirror = ([x, y]: Pt): Pt => [W - x, y];
const f = ([x, y]: Pt) => `${round(x)} ${round(y)}`;
const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Construit une forme symétrique à partir de sa moitié droite, décrite du
 * haut-centre vers le bas-centre en courbes de Bézier cubiques.
 */
function symmetric(start: Pt, segs: Seg[]): string {
  let d = `M${f(start)}`;
  for (const [c1, c2, p] of segs) d += ` C${f(c1)} ${f(c2)} ${f(p)}`;
  // Moitié gauche : segments parcourus à l'envers et en miroir.
  for (let i = segs.length - 1; i >= 0; i--) {
    const [c1, c2] = segs[i];
    const prev = i === 0 ? start : segs[i - 1][2];
    d += ` C${f(mirror(c2))} ${f(mirror(c1))} ${f(mirror(prev))}`;
  }
  return d + " Z";
}

function path(start: Pt, segs: Seg[], close = false) {
  let d = `M${f(start)}`;
  for (const [c1, c2, p] of segs) d += ` C${f(c1)} ${f(c2)} ${f(p)}`;
  return close ? d + " Z" : d;
}

function mirrorPath(start: Pt, segs: Seg[], close = false) {
  return path(mirror(start), segs.map(([a, b, c]) => [mirror(a), mirror(b), mirror(c)] as Seg), close);
}

// ---------------------------------------------------------------------------
// Mannequin
// ---------------------------------------------------------------------------

export const mannequin = {
  head: "M200 44 C226 44 240 66 240 96 C240 128 222 150 200 150 C178 150 160 128 160 96 C160 66 174 44 200 44 Z",
  body: symmetric(
    [200, 140],
    [
      [[208, 140], [214, 142], [215, 150]],
      [[216, 158], [216, 164], [218, 170]],
      [[236, 176], [262, 178], [280, 190]],
      [[292, 200], [292, 222], [284, 244]],
      [[276, 280], [268, 330], [254, 382]],
      [[262, 410], [274, 440], [274, 470]],
      [[276, 560], [262, 680], [254, 760]],
      [[250, 840], [240, 900], [238, 948]],
      [[244, 962], [262, 976], [258, 986]],
      [[240, 992], [222, 990], [214, 984]],
      [[212, 960], [212, 900], [210, 840]],
      [[208, 720], [206, 600], [200, 512]],
    ],
  ),
  armRight: path(
    [282, 214],
    [
      [[298, 240], [304, 320], [306, 392]],
      [[308, 450], [314, 500], [318, 546]],
      [[326, 572], [322, 600], [308, 600]],
      [[298, 598], [296, 576], [298, 552]],
      [[294, 500], [288, 440], [284, 396]],
      [[282, 340], [280, 290], [274, 262]],
    ],
    true,
  ),
  get armLeft() {
    return mirrorPath(
      [282, 214],
      [
        [[298, 240], [304, 320], [306, 392]],
        [[308, 450], [314, 500], [318, 546]],
        [[326, 572], [322, 600], [308, 600]],
        [[298, 598], [296, 576], [298, 552]],
        [[294, 500], [288, 440], [284, 396]],
        [[282, 340], [280, 290], [274, 262]],
      ],
      true,
    );
  },
};

// ---------------------------------------------------------------------------
// Vêtements
// ---------------------------------------------------------------------------

type GarmentShape = {
  /** Silhouette principale, couleur primaire. */
  body: string;
  /** Détails dans la couleur secondaire (col, poignets…). */
  accents?: string[];
  /** Coutures et plis (traits). */
  lines: string[];
  /** Boutons [x, y]. */
  buttons?: Pt[];
  /** Cadre de recadrage pour l'image détourée : x, y, largeur, hauteur. */
  crop: [number, number, number, number];
  /** Le vêtement passe derrière les bras du mannequin. */
  underArms?: boolean;
};

const longSleeveRight: Seg[] = [
  [[302, 200], [310, 300], [313, 392]],
  [[316, 460], [319, 510], [322, 538]],
  [[314, 543], [304, 545], [296, 544]],
  [[292, 470], [288, 340], [280, 252]],
];

export const garments: Record<GarmentType, GarmentShape> = {
  tshirt: {
    body: symmetric(
      [200, 190],
      [
        [[212, 190], [220, 180], [224, 166]],
        [[244, 170], [268, 176], [284, 186]],
        [[300, 196], [312, 228], [322, 264]],
        [[312, 270], [300, 274], [290, 276]],
        [[288, 264], [284, 254], [280, 248]],
        [[282, 320], [280, 400], [282, 472]],
        [[252, 478], [226, 480], [200, 480]],
      ],
    ),
    lines: [
      "M176 166 C182 184 190 192 200 192 C210 192 218 184 224 166",
      "M290 276 C292 262 288 250 282 244",
      "M110 276 C108 262 112 250 118 244",
      "M236 300 C240 360 238 420 244 470",
      "M162 320 C160 380 164 430 160 472",
    ],
    crop: [60, 140, 280, 370],
  },
  top: {
    body: symmetric(
      [200, 176],
      [
        [[208, 176], [218, 172], [222, 162]],
        [[244, 168], [268, 176], [284, 186]],
        ...longSleeveRight,
        [[282, 330], [282, 410], [284, 486]],
        [[254, 492], [226, 494], [200, 494]],
      ],
    ),
    accents: ["M178 162 C184 150 216 150 222 162 L222 176 C214 182 186 182 178 176 Z"],
    lines: [
      "M200 182 L200 300",
      "M296 544 C292 470 288 340 280 252",
      "M104 544 C108 470 112 340 120 252",
      "M240 320 C244 380 240 440 246 486",
      "M158 340 C156 400 160 450 156 488",
    ],
    buttons: [
      [200, 206],
      [200, 240],
      [200, 274],
    ],
    crop: [60, 130, 280, 430],
  },
  shirt: {
    body: symmetric(
      [200, 178],
      [
        [[210, 176], [218, 170], [222, 160]],
        [[244, 168], [268, 176], [284, 186]],
        ...longSleeveRight,
        [[282, 330], [284, 420], [286, 500]],
        [[262, 514], [230, 520], [200, 512]],
      ],
    ),
    accents: [
      "M200 182 L178 160 C188 156 196 158 200 164 Z",
      "M200 182 L222 160 C212 156 204 158 200 164 Z",
      "M296 530 L322 528 L322 540 L296 544 Z",
      "M104 530 L78 528 L78 540 L104 544 Z",
    ],
    lines: [
      "M200 182 L200 512",
      "M206 182 L206 512",
      "M296 544 C292 470 288 340 280 252",
      "M104 544 C108 470 112 340 120 252",
      "M226 230 L262 230 L262 262 L226 262 Z",
    ],
    buttons: [
      [203, 214],
      [203, 270],
      [203, 326],
      [203, 382],
      [203, 438],
    ],
    crop: [60, 130, 280, 430],
  },
  jacket: {
    body: symmetric(
      [200, 196],
      [
        [[210, 190], [222, 178], [228, 160]],
        [[250, 168], [272, 176], [290, 188]],
        [[306, 202], [314, 300], [318, 394]],
        [[321, 462], [324, 510], [328, 540]],
        [[318, 548], [306, 550], [298, 550]],
        [[294, 470], [290, 340], [284, 258]],
        [[288, 340], [290, 440], [294, 530]],
        [[264, 540], [232, 544], [200, 544]],
      ],
    ),
    accents: [
      // Col montant contrasté
      "M172 160 C178 140 222 140 228 160 L232 186 C222 200 178 200 168 186 Z",
      // Poignets
      "M298 528 L326 524 L328 540 L298 550 Z",
      "M102 528 L74 524 L72 540 L102 550 Z",
      // Bas
      "M106 524 C150 532 250 532 294 524 L294 532 C264 542 136 542 106 532 Z",
    ],
    lines: [
      "M200 196 L200 544",
      "M298 550 C294 470 290 340 284 258",
      "M102 550 C106 470 110 340 116 258",
      "M232 380 L268 380",
      "M168 380 L132 380",
    ],
    crop: [56, 120, 288, 450],
  },
  dress: {
    body: symmetric(
      [200, 214],
      [
        [[210, 204], [214, 176], [215, 156]],
        [[219, 154], [222, 156], [224, 160]],
        [[230, 190], [252, 214], [270, 240]],
        [[266, 300], [254, 350], [252, 392]],
        [[272, 470], [302, 600], [322, 742]],
        [[282, 756], [240, 760], [200, 760]],
      ],
    ),
    accents: ["M148 392 C180 400 220 400 252 392 L254 404 C220 412 180 412 146 404 Z"],
    lines: [
      "M186 300 C192 296 208 296 214 300",
      "M228 410 C240 520 252 640 262 752",
      "M200 412 L200 760",
      "M172 410 C160 520 148 640 138 752",
      "M246 410 C268 520 290 640 304 746",
      "M154 410 C132 520 110 640 96 746",
    ],
    crop: [60, 140, 280, 640],
    underArms: true,
  },
  trousers: {
    body: symmetric(
      [200, 374],
      [
        [[220, 374], [240, 374], [256, 374]],
        [[266, 400], [276, 440], [278, 480]],
        [[282, 620], [286, 800], [288, 944]],
        [[270, 948], [250, 948], [230, 946]],
        [[224, 800], [214, 640], [204, 524]],
        [[203, 518], [202, 514], [200, 512]],
      ],
    ),
    accents: ["M144 374 L256 374 L258 396 L142 396 Z"],
    lines: [
      "M200 396 L200 470",
      "M240 400 C244 560 252 760 258 944",
      "M160 400 C156 560 148 760 142 944",
      "M226 396 C230 420 232 440 230 460",
      "M174 396 C170 420 168 440 170 460",
    ],
    crop: [100, 350, 200, 620],
  },
  skirt: {
    body: symmetric(
      [200, 374],
      [
        [[220, 374], [240, 374], [254, 374]],
        [[262, 420], [290, 560], [306, 690]],
        [[270, 700], [236, 704], [200, 704]],
      ],
    ),
    accents: ["M146 374 L254 374 L256 398 L144 398 Z"],
    lines: [
      "M224 400 C234 500 244 600 252 700",
      "M176 400 C166 500 156 600 148 700",
      "M200 400 L200 704",
    ],
    crop: [80, 350, 240, 380],
  },
  tote: {
    body: "M280 586 L364 586 L372 700 L272 700 Z",
    accents: [
      "M292 588 C292 540 306 526 312 526 C320 526 334 540 334 588 L326 588 C326 548 318 536 312 536 C306 536 300 548 300 588 Z",
    ],
    lines: ["M280 606 L364 606", "M300 640 L344 640"],
    crop: [252, 510, 140, 210],
  },
};

// ---------------------------------------------------------------------------
// Rendu SVG
// ---------------------------------------------------------------------------

export type Palette = { primary: string; secondary?: string; stripes?: string };

let uid = 0;

/** Groupe SVG d'un vêtement, avec texture tissée, ombrage et coutures. */
export function garmentSvg(type: GarmentType, palette: Palette, idPrefix = `g${uid++}`): string {
  const shape = garments[type];
  const secondary = palette.secondary ?? shade(palette.primary, -0.12);
  const fill = palette.stripes ? `url(#${idPrefix}-stripes)` : palette.primary;
  const ink = luminance(palette.primary) > 0.5 ? "rgba(40,30,20,.22)" : "rgba(255,250,240,.18)";
  return `
  <defs>
    <pattern id="${idPrefix}-weave" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M0 1.5H6M0 4.5H6" stroke="rgba(0,0,0,.07)" stroke-width="1"/>
      <path d="M1.5 0V6M4.5 0V6" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
    </pattern>
    ${
      palette.stripes
        ? `<pattern id="${idPrefix}-stripes" width="400" height="22" patternUnits="userSpaceOnUse"><rect width="400" height="22" fill="${palette.primary}"/><rect y="0" width="400" height="8" fill="${palette.stripes}"/></pattern>`
        : ""
    }
    <linearGradient id="${idPrefix}-shade" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".22"/>
      <stop offset=".3" stop-color="#000" stop-opacity="0"/>
      <stop offset=".55" stop-color="#fff" stop-opacity=".09"/>
      <stop offset="1" stop-color="#000" stop-opacity=".26"/>
    </linearGradient>
    <clipPath id="${idPrefix}-clip"><path d="${shape.body}"/></clipPath>
  </defs>
  <g class="garment">
    <path d="${shape.body}" fill="${fill}"/>
    <g clip-path="url(#${idPrefix}-clip)">
      <rect x="0" y="0" width="400" height="1000" fill="url(#${idPrefix}-weave)"/>
      <rect x="0" y="0" width="400" height="1000" fill="url(#${idPrefix}-shade)"/>
    </g>
    ${(shape.accents ?? []).map((d) => `<path d="${d}" fill="${secondary}"/>`).join("")}
    ${shape.lines.map((d) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`).join("")}
    ${(shape.buttons ?? [])
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${shade(palette.primary, 0.25)}" stroke="${ink}" stroke-width="1"/>`)
      .join("")}
  </g>`;
}

/** Mannequin seul (couleur plâtre), avec ou sans vêtement par-dessus. */
export function mannequinSvg(tone = "#E4DCCF", garment?: { type: GarmentType; palette: Palette; id?: string }): string {
  const shapeUnder = garment && garments[garment.type].underArms;
  const g = garment ? garmentSvg(garment.type, garment.palette, garment.id) : "";
  const mid = shade(tone, -0.08);
  const dark = shade(tone, -0.2);
  return `
  <defs>
    <linearGradient id="mq-tone" x1="0" x2="1">
      <stop offset="0" stop-color="${dark}"/>
      <stop offset=".45" stop-color="${tone}"/>
      <stop offset="1" stop-color="${mid}"/>
    </linearGradient>
  </defs>
  <path d="${mannequin.body}" fill="url(#mq-tone)"/>
  <path d="${mannequin.head}" fill="url(#mq-tone)"/>
  ${shapeUnder ? g : ""}
  <path d="${mannequin.armRight}" fill="url(#mq-tone)"/>
  <path d="${mannequin.armLeft}" fill="url(#mq-tone)"/>
  ${shapeUnder ? "" : g}`;
}

// ---------------------------------------------------------------------------
// Couleurs
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const mix = (c: number) => Math.round((t - c) * p + c);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
