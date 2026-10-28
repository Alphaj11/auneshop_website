"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMotionPref } from "@/components/ui/MotionPref";
import type { BasketCard } from "./projet-content";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Inclinaisons stables, d'aspect posé à la main. */
const tiltOf = (i: number) => ((i * 37) % 9) - 4;
const LABEL: Record<BasketCard["kind"], string> = { presse: "Revue de presse", article: "Le projet", page: "Sur le site" };

/** Panier à linge en osier : bandes tressées, anses, du linge et des feuilles qui dépassent. */
function BasketArt() {
  const rows = 6;
  return (
    <svg viewBox="0 0 360 260" className="h-auto w-full" aria-hidden>
      <ellipse cx="180" cy="248" rx="150" ry="10" fill="#3E0812" opacity=".12" />
      {/* Linge et papiers qui dépassent */}
      <path d="M70 70 C90 30 130 40 150 62 L160 90 L64 92 Z" fill="#EDE6D6" />
      <rect x="150" y="18" width="62" height="80" rx="3" fill="#F6F0E4" transform="rotate(-8 181 58)" />
      <rect x="196" y="26" width="58" height="74" rx="3" fill="#FBF7EF" transform="rotate(10 225 63)" />
      <path d="M196 36 h40 M196 46 h32 M196 56 h38" stroke="#3E0812" strokeOpacity=".25" strokeWidth="2" transform="rotate(10 225 63)" />
      <path d="M240 64 C262 40 300 46 300 86 L238 92 Z" fill="#C2923A" opacity=".85" />
      {/* Corps tressé */}
      <path d="M40 92 L320 92 L292 240 L68 240 Z" fill="#B88A58" />
      {Array.from({ length: rows }, (_, r) => {
        const y = 100 + r * 23;
        const inset = 4 + r * 4.6;
        return Array.from({ length: 12 }, (_, i) => {
          const x0 = 44 + inset + i * ((272 - inset * 2) / 12);
          return (
            <rect
              key={`${r}-${i}`}
              x={x0 + ((r + i) % 2) * 2}
              y={y}
              width={(272 - inset * 2) / 12 - 3}
              height="18"
              rx="7"
              fill={(r + i) % 2 ? "#C79B67" : "#A97B4B"}
            />
          );
        });
      })}
      {/* Rebord et anses */}
      <rect x="32" y="84" width="296" height="16" rx="8" fill="#9C6F42" />
      <path d="M40 92 C20 92 18 120 44 122" stroke="#8A5F36" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M320 92 C340 92 342 120 316 122" stroke="#8A5F36" strokeWidth="9" fill="none" strokeLinecap="round" />
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
        className="group mx-auto mt-5 block w-[min(70vw,17rem)] transition-transform duration-500 ease-[var(--ease-cloth)] hover:-translate-y-2"
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
                  href={c.href}
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
