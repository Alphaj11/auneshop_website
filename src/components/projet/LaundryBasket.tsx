"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMotionPref } from "@/components/ui/MotionPref";
import type { BasketCard } from "./projet-content";
import { withBase } from "@/lib/site-mode";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Inclinaisons stables, d'aspect posé à la main. */
const tiltOf = (i: number) => ((i * 37) % 9) - 4;
const LABEL: Record<BasketCard["kind"], string> = { presse: "Revue de presse", article: "Le projet", page: "Sur le site" };

/* ——— Panier en osier, tressé rang par rang ——— */
const CX = 200;
const TOP = { y: 112, rx: 160, ry: 34 };
const BOTTOM = { y: 292, rx: 128, ry: 22 };
const ROWS = 10;
const STAKES = 20;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const at = (t: number, theta: number) => ({
  x: CX - lerp(TOP.rx, BOTTOM.rx, t) * Math.cos(theta),
  y: lerp(TOP.y, BOTTOM.y, t) + lerp(TOP.ry, BOTTOM.ry, t) * Math.sin(theta),
});
const arc = (t: number, a: number, b: number, n = 5) =>
  Array.from({ length: n }, (_, i) => at(t, lerp(a, b, i / (n - 1))))
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
const TONES = ["#C99A62", "#B88752", "#D4A86F", "#BF8F59"];
const ROW_H = (BOTTOM.y - TOP.y) / ROWS;
/** Brins horizontaux, passant tour à tour devant et derrière les montants. */
const WEAVE = Array.from({ length: ROWS }, (_, r) =>
  Array.from({ length: STAKES }, (_, k) => ({
    d: arc((r + 0.5) / ROWS, (Math.PI * k) / STAKES, (Math.PI * (k + 1)) / STAKES),
    over: (r + k) % 2 === 0,
    tone: TONES[(r * 7 + k * 3) % TONES.length],
  })),
).flat();
const STAKE_LINES = Array.from({ length: STAKES + 1 }, (_, k) => {
  const a = at(0, (Math.PI * k) / STAKES);
  const b = at(1, (Math.PI * k) / STAKES);
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
});
const BODY = `M${CX - TOP.rx} ${TOP.y} L${CX - BOTTOM.rx} ${BOTTOM.y} A${BOTTOM.rx} ${BOTTOM.ry} 0 0 0 ${CX + BOTTOM.rx} ${BOTTOM.y} L${CX + TOP.rx} ${TOP.y} A${TOP.rx} ${TOP.ry} 0 0 1 ${CX - TOP.rx} ${TOP.y} Z`;
/** Bord tressé : petits brins inclinés le long de l'ellipse d'ouverture. */
const rim = (from: number, to: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const th = lerp(from, to, (i + 0.5) / n);
    const r1 = (v: number) => Math.round(v * 10) / 10;
    return { x: r1(CX - TOP.rx * Math.cos(th)), y: r1(TOP.y + TOP.ry * Math.sin(th)), i };
  });
const RIM_FRONT = rim(0, Math.PI, 40);
const RIM_BACK = rim(Math.PI, Math.PI * 2, 36);
const handle = (side: number) =>
  `M${CX + side * 150} ${TOP.y + 14} C${CX + side * 184} ${TOP.y + 12} ${CX + side * 186} ${TOP.y + 50} ${CX + side * 146} ${TOP.y + 50}`;

/** Panier à linge en osier : tressage, bord torsadé, anses en corde, linge et papiers. */
function BasketArt() {
  return (
    <svg viewBox="0 0 400 330" className="h-auto w-full overflow-visible" aria-hidden>
      <defs>
        <clipPath id="lb-body">
          <path d={BODY} />
        </clipPath>
        <linearGradient id="lb-round" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a1406" stopOpacity=".55" />
          <stop offset=".3" stopColor="#2a1406" stopOpacity=".05" />
          <stop offset=".42" stopColor="#fff3dc" stopOpacity=".12" />
          <stop offset=".7" stopColor="#2a1406" stopOpacity=".1" />
          <stop offset="1" stopColor="#2a1406" stopOpacity=".6" />
        </linearGradient>
        <linearGradient id="lb-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1406" stopOpacity=".35" />
          <stop offset=".25" stopColor="#2a1406" stopOpacity="0" />
          <stop offset=".85" stopColor="#2a1406" stopOpacity=".12" />
          <stop offset="1" stopColor="#2a1406" stopOpacity=".4" />
        </linearGradient>
        <radialGradient id="lb-inside" cx="50%" cy="20%" r="80%">
          <stop offset="0" stopColor="#4a2c12" />
          <stop offset="1" stopColor="#24130a" />
        </radialGradient>
        <linearGradient id="lb-linen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBF6EC" />
          <stop offset="1" stopColor="#DCCFB8" />
        </linearGradient>
        <linearGradient id="lb-towel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3ECDF" />
          <stop offset="1" stopColor="#D2C4AA" />
        </linearGradient>
        <filter id="lb-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4 .25" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 .16  0 0 0 0 .08  0 0 0 0 .02  0 0 0 .55 -.12" />
        </filter>
        <filter id="lb-shadow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* Ombre portée au sol */}
      <ellipse cx={CX} cy={BOTTOM.y + 14} rx={BOTTOM.rx + 30} ry="16" fill="#3E0812" opacity=".28" filter="url(#lb-shadow)" />
      <ellipse cx={CX} cy={BOTTOM.y + 6} rx={BOTTOM.rx - 6} ry="8" fill="#1d0c04" opacity=".35" filter="url(#lb-shadow)" />

      {/* Intérieur sombre et bord arrière */}
      <ellipse cx={CX} cy={TOP.y} rx={TOP.rx} ry={TOP.ry} fill="url(#lb-inside)" />
      {RIM_BACK.map((p) => (
        <ellipse key={p.i} cx={p.x} cy={p.y} rx="7" ry="4.5" transform={`rotate(${p.i % 2 ? 28 : -28} ${p.x} ${p.y})`} fill={p.i % 2 ? "#8F6236" : "#A87745"} />
      ))}

      {/* Le contenu : papiers et linge plié */}
      <g transform="rotate(-9 150 70)">
        <rect x="120" y="28" width="62" height="84" rx="2" fill="#FBF7EF" stroke="#d9cdb6" />
        <path d="M130 44 h40 M130 54 h34 M130 64 h38 M130 74 h26" stroke="#3E0812" strokeOpacity=".28" strokeWidth="2" />
      </g>
      <g transform="rotate(11 250 70)">
        <rect x="222" y="24" width="58" height="88" rx="2" fill="#F4ECDD" stroke="#d9cdb6" />
        <rect x="230" y="34" width="42" height="24" fill="#3E0812" opacity=".18" />
        <path d="M230 66 h40 M230 75 h32 M230 84 h38" stroke="#3E0812" strokeOpacity=".25" strokeWidth="2" />
      </g>
      <path d="M70 108 C76 74 120 66 150 80 C168 70 196 72 206 92 C226 80 262 80 276 98 C300 86 330 96 332 112 C300 128 100 128 70 108 Z" fill="url(#lb-linen)" />
      <g fill="none" stroke="#bfae90" strokeWidth="1.6" strokeLinecap="round" opacity=".8">
        <path d="M96 96 C112 88 132 88 146 96" />
        <path d="M168 92 C180 86 194 88 202 98" />
        <path d="M240 96 C254 90 270 92 280 104" />
      </g>

      {/* Corps tressé : brins de dessous, montants, brins de dessus, grain et volume */}
      <g clipPath="url(#lb-body)">
        <path d={BODY} fill="#7A5230" />
        {WEAVE.filter((w) => !w.over).map((w, i) => (
          <path key={`u${i}`} d={w.d} fill="none" stroke="#8A5F36" strokeWidth={ROW_H * 0.72} strokeLinecap="round" />
        ))}
        {STAKE_LINES.map((d, i) => (
          <path key={`s${i}`} d={d} stroke="#9C6D3E" strokeWidth="5" strokeLinecap="round" />
        ))}
        {WEAVE.filter((w) => w.over).map((w, i) => (
          <g key={`o${i}`}>
            <path d={w.d} fill="none" stroke={w.tone} strokeWidth={ROW_H * 0.8} strokeLinecap="round" />
            <path d={w.d} fill="none" stroke="#F1D6A6" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" transform={`translate(0 ${-ROW_H * 0.2})`} />
          </g>
        ))}
        <rect width="400" height="330" filter="url(#lb-grain)" opacity=".7" />
        <path d={BODY} fill="url(#lb-round)" />
        <path d={BODY} fill="url(#lb-depth)" />
      </g>

      {/* Anses en corde */}
      {[-1, 1].map((side) => (
        <g key={side} fill="none" strokeLinecap="round" strokeWidth="10">
          <path d={handle(side)} stroke="#6E4824" />
          <path d={handle(side)} stroke="#B98A55" strokeDasharray="4 4" />
        </g>
      ))}

      {/* Bord avant torsadé */}
      {RIM_FRONT.map((p) => (
        <ellipse key={p.i} cx={p.x} cy={p.y} rx="8.5" ry="5.5" transform={`rotate(${p.i % 2 ? 30 : -30} ${p.x} ${p.y})`} fill={p.i % 2 ? "#A06F3F" : "#C08E57"} stroke="#6E4824" strokeWidth=".6" />
      ))}

      {/* Torchon rayé posé sur le bord */}
      <path d="M252 104 C272 110 292 110 306 106 C312 140 310 176 300 206 C284 210 270 208 258 202 C262 170 260 136 252 104 Z" fill="url(#lb-towel)" />
      <path d="M259 186 C272 192 288 192 302 188" stroke="#3E0812" strokeOpacity=".55" strokeWidth="3" fill="none" />
      <path d="M260 194 C272 199 287 199 301 196" stroke="#3E0812" strokeOpacity=".3" strokeWidth="2" fill="none" />
      <path d="M278 112 C282 146 282 176 278 204" stroke="#bfae90" strokeWidth="1.4" fill="none" opacity=".7" />
      <path d="M258 202 C270 208 284 210 300 206 l-2 6 C284 216 270 214 258 208 Z" fill="#cbbb9d" />
    </svg>
  );
}

/**
 * Le panier à linge : au clic, les pages du site, les articles du projet et la revue de
 * presse s'envolent et se posent sur l'écran ; un clic sur une carte l'ouvre, « Fermer »
 * (ou Échap) les range à nouveau dans le panier.
 */
export function LaundryBasket({ cards }: { cards: BasketCard[] }) {
  const { reduced } = useMotionPref();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const basket = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLUListElement>(null);

  // Envol : chaque carte part du panier et rejoint sa place dans la grille.
  useLayoutEffect(() => {
    if (!open || closing || !grid.current || !basket.current) return;
    const b = basket.current.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const by = b.top + b.height * 0.35;
    const items = [...grid.current.querySelectorAll<HTMLElement>("[data-card]")];
    items.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const dx = bx - (r.left + r.width / 2);
      const dy = by - (r.top + r.height / 2);
      el.animate(
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.25) rotate(${tiltOf(i) * 6}deg)` },
              { opacity: 1, transform: `translate(0, 0) scale(1) rotate(${tiltOf(i)}deg)` },
            ],
        { duration: reduced ? 200 : 750, delay: reduced ? 0 : i * 55, easing: EASE, fill: "both" },
      );
    });
    items[0]?.querySelector("a")?.focus({ preventScroll: true });
  }, [open, closing, reduced]);

  const close = () => {
    if (!grid.current || !basket.current || closing) return;
    setClosing(true);
    const b = basket.current.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const by = b.top + b.height * 0.35;
    const items = [...grid.current.querySelectorAll<HTMLElement>("[data-card]")];
    const anims = items.map((el, i) => {
      el.getAnimations().forEach((a) => a.cancel());
      const r = el.getBoundingClientRect();
      return el.animate(
        reduced
          ? [{ opacity: 1 }, { opacity: 0 }]
          : [
              { opacity: 1, transform: `rotate(${tiltOf(i)}deg)` },
              { opacity: 0, transform: `translate(${bx - (r.left + r.width / 2)}px, ${by - (r.top + r.height / 2)}px) scale(.25)` },
            ],
        { duration: reduced ? 150 : 520, delay: reduced ? 0 : (items.length - i) * 35, easing: "cubic-bezier(.6,0,.8,.4)", fill: "both" },
      );
    });
    Promise.all(anims.map((a) => a.finished))
      .catch(() => undefined)
      .then(() => {
        setOpen(false);
        setClosing(false);
        basket.current?.focus();
      });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });

  return (
    // Pas de z-index ici : le calque des cartes doit passer au-dessus de l'en-tête.
    <section className="relative pb-16 pt-12 text-center" aria-labelledby="panier-titre">
      <h2 id="panier-titre" className="display-md">
        Dans le panier à linge
      </h2>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">
        Les pages du projet, ses articles et ce que la presse en dit : ouvrez le panier et choisissez.
      </p>
      <button
        ref={basket}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="panier-contenu"
        className="group mx-auto mt-5 block w-[min(80vw,21rem)] transition-transform duration-500 ease-[var(--ease-cloth)] hover:-translate-y-2"
      >
        <BasketArt />
        <span className="mt-2 inline-block text-xs uppercase tracking-[0.2em] text-ink-soft group-hover:text-ink">
          {open ? "Ranger" : "Ouvrir le panier"}
        </span>
      </button>

      {open && (
        <div
          id="panier-contenu"
          role="dialog"
          aria-modal="true"
          aria-label="Contenu du panier à linge"
          className="fixed inset-0 z-[80] overflow-y-auto bg-paper/90 px-5 pb-16 pt-6 backdrop-blur-md md:px-10 md:pt-10"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="sticky top-0 z-10 mx-auto mb-6 flex max-w-6xl justify-end">
            <button type="button" onClick={close} className="btn btn-primary">
              Ranger dans le panier
            </button>
          </div>
          <ul ref={grid} className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c, i) => (
              <li key={c.href} data-card style={{ opacity: 0 }}>
                <a
                  href={c.external ? c.href : withBase(c.href)}
                  target={c.external ? "_blank" : undefined}
                  rel={c.external ? "noopener noreferrer" : undefined}
                  className="block h-full rounded-[3px] border border-line bg-[#FBF7EF] p-5 text-left shadow-[0_18px_40px_-24px_rgba(62,8,18,.45)] transition-transform hover:-translate-y-1 hover:rotate-0"
                  style={{ rotate: `${tiltOf(i) * 0.4}deg` }}
                >
                  <p className="eyebrow">{LABEL[c.kind]}</p>
                  {c.kind === "presse" && <p className="mt-3 text-xs uppercase tracking-[0.14em] text-ink-soft">{c.source}</p>}
                  <p className="mt-2 font-display text-2xl leading-tight">{c.title}</p>
                  {c.date && <p className="mt-3 text-xs text-ink-mute">{c.date}</p>}
                  <p className="mt-4 text-xs text-ink-soft">{c.external ? "Lire sur auneshop.fr ↗" : "Voir la page →"}</p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
