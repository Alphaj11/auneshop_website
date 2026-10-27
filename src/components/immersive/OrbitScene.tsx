"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ProductCardData } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { useMotionPref } from "@/components/ui/MotionPref";
import { useCart } from "@/components/shop/CartProvider";
import { ArrowIcon } from "@/components/shop/Icons";

export type OrbitVariant = { id: string; size: string; color: string; colorHex: string | null; available: boolean; priceCents: number };

const PAPER: [number, number, number] = [230, 218, 199];

/**
 * Teinte dominante d'une image (moyenne pondérée par la saturation, au centre),
 * utilisée pour faire prendre au décor la couleur du vêtement présenté.
 */
function useThemeColor(url: string | null | undefined, fallback: string) {
  const [sampled, setSampled] = useState<{ url: string; rgb: [number, number, number] } | null>(null);
  const rgb = sampled && sampled.url === url ? sampled.rgb : null;
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 24;
      c.height = 30;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (!g) return;
      g.drawImage(img, 0, 0, 24, 30);
      const d = g.getImageData(4, 4, 16, 22).data;
      let r = 0, gr = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const max = Math.max(d[i], d[i + 1], d[i + 2]);
        const min = Math.min(d[i], d[i + 1], d[i + 2]);
        const k = 0.15 + (max ? (max - min) / max : 0) * 2;
        r += d[i] * k;
        gr += d[i + 1] * k;
        b += d[i + 2] * k;
        w += k;
      }
      if (alive && w) setSampled({ url, rgb: [r / w, gr / w, b / w] });
    };
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  if (!rgb) return { wash: `color-mix(in srgb, ${fallback} 30%, var(--paper))`, deep: `color-mix(in srgb, ${fallback} 45%, var(--paper-2))` };
  const mixTo = (t: number) => `rgb(${rgb.map((v, i) => Math.round(v + (PAPER[i] - v) * t)).join(",")})`;
  return { wash: mixTo(0.55), deep: mixTo(0.3) };
}

/**
 * Collection immersive : un mannequin au centre, les pièces en orbite elliptique.
 *
 * Niveau actuel : 1 et 2 (images préparées du mannequin habillé + transitions).
 * Il ne s'agit PAS d'un essayage 3D : le mannequin affiche une image préparée
 * pour chaque pièce et chaque coloris. L'architecture (props `looks`) permet de
 * brancher plus tard un rendu Three.js (niveau 3) sans changer les données.
 */
export function OrbitScene({
  products,
  variants,
  accent,
  speed = 1,
  overlay,
}: {
  overlay?: React.ReactNode;
  products: ProductCardData[];
  variants: Record<string, OrbitVariant[]>;
  accent: string;
  speed?: number;
}) {
  const { reduced } = useMotionPref();
  const { add, pending } = useCart();
  const items = useMemo(() => products.filter((p) => p.looks.some((l) => l.cutout || l.gallery)), [products]);
  const n = items.length;
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  const phi = useRef(0); // rotation globale
  const target = useRef<number | null>(null);
  const paused = useRef(false);
  const drag = useRef<{ x: number; phi: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const [view, setView] = useState<string | null>(null); // image secondaire mise en avant
  const [orbitOpen, setOrbitOpen] = useState(false); // images secondaires visibles (survol)
  const product = items[selected];
  const look = product?.looks.find((l) => l.color === color) ?? product?.looks[0];
  const mainImage = view ?? look?.gallery ?? null;
  const satellites = (product?.gallery ?? []).filter((u) => u !== mainImage).slice(0, 5);
  const theme = useThemeColor(look?.gallery ?? look?.worn, accent);
  const productVariants = product ? variants[product.id] ?? [] : [];
  const sizes = productVariants.filter((v) => v.color === (color ?? look?.color));
  const chosen = sizes.find((v) => v.size === size);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const on = () => setCompact(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Position de chaque pièce sur l'ellipse, mise à jour à chaque image.
  const layout = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    // L'anneau des autres pièces passe au pied de la pièce présentée.
    const rx = w * (compact ? 0.42 : 0.4);
    const ry = h * (compact ? 0.05 : 0.07);
    const cy = h * (compact ? 0.83 : 0.86);
    nodes.current.forEach((node, i) => {
      if (!node) return;
      const a = (i / n) * Math.PI * 2 + phi.current;
      const depth = Math.cos(a); // 1 = devant, -1 = derrière
      const x = w / 2 + Math.sin(a) * rx;
      const y = cy + depth * ry;
      const s = 0.5 + ((depth + 1) / 2) * 0.45;
      const focus = hovered === i ? 1.12 : 1;
      node.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${s * focus})`;
      node.style.zIndex = String(depth > 0 ? 30 + Math.round(depth * 10) : 5 + Math.round((depth + 1) * 5));
      node.style.opacity = String(0.35 + ((depth + 1) / 2) * 0.65);
      node.style.filter = depth < -0.2 ? `blur(${Math.round(-depth * 2)}px) saturate(.8)` : "none";
    });
  }, [n, compact, hovered]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (target.current !== null) {
        const diff = target.current - phi.current;
        phi.current += diff * Math.min(1, dt / (reduced ? 16 : 160));
        if (Math.abs(diff) < 0.001) {
          phi.current = target.current;
          target.current = null;
        }
      } else if (!paused.current && !drag.current && !reduced) {
        phi.current += dt * 0.00006 * speed;
      }
      layout();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layout, reduced, speed]);

  const bringToFront = (i: number) => {
    const base = -(i / n) * Math.PI * 2;
    const k = Math.round((phi.current - base) / (Math.PI * 2));
    target.current = base + k * Math.PI * 2;
  };

  const select = (i: number) => {
    const idx = ((i % n) + n) % n;
    setSelected(idx);
    setColor(null);
    setSize(null);
    setView(null);
    bringToFront(idx);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, phi: phi.current, moved: false };
    target.current = null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !stage.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 6) drag.current.moved = true;
    phi.current = drag.current.phi + (dx / stage.current.clientWidth) * Math.PI * 1.6;
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (moved) {
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 60);
      // Sélectionne la pièce la plus proche de l'avant.
      let best = 0;
      let bestDepth = -2;
      for (let i = 0; i < n; i++) {
        const d = Math.cos((i / n) * Math.PI * 2 + phi.current);
        if (d > bestDepth) {
          bestDepth = d;
          best = i;
        }
      }
      select(best);
    }
  };

  if (!n || !product) return null;

  const worn = look?.worn;
  const label = hovered !== null ? items[hovered] : null;

  return (
    <section
      className="relative overflow-hidden"
      aria-roledescription="carrousel"
      aria-label="Collection en vue immersive"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") select(selected + 1);
        if (e.key === "ArrowLeft") select(selected - 1);
      }}
    >
      {/* Décor : il prend la teinte de la pièce présentée, avec sa photo en flou d'ambiance. */}
      <div
        className="absolute inset-0 transition-[background] duration-[1400ms] ease-[var(--ease-cloth)]"
        aria-hidden
        style={{ background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${theme.wash}, ${theme.deep} 120%)` }}
      />
      <AnimatePresence>
        {mainImage && !worn && (
          <motion.div
            key={mainImage}
            aria-hidden
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.42 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mainImage} alt="" className="h-full w-full scale-125 object-cover blur-[60px] saturate-[1.2]" />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-0" aria-hidden style={{ background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, rgba(30,20,12,.18))" }} />

      <div
        ref={stage}
        className="relative mx-auto h-[calc(100svh-4rem)] min-h-[560px] max-w-[1600px] touch-pan-y select-none md:h-[calc(100svh-5rem)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => {
          paused.current = false;
          setHovered(null);
        }}
      >
        {overlay}
        {/* Anneau au sol */}
        <div aria-hidden className="absolute left-1/2 top-[86%] h-[14%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-ink/10 md:w-[82%]" />
        <div aria-hidden className="absolute left-1/2 top-[90%] h-8 w-72 -translate-x-1/2 rounded-[50%] bg-ink/25 blur-2xl" />

        {/* Pièce présentée, en grand ; ses images secondaires gravitent autour au survol. */}
        <div
          className="absolute left-1/2 top-[25%] z-20 h-[52%] -translate-x-1/2 md:top-[20%] md:h-[56%] lg:top-[9%] lg:h-[68%] xl:top-[7%] xl:h-[78%]"
          style={{ aspectRatio: worn ? "2 / 5" : "4 / 5" }}
          onMouseEnter={() => setOrbitOpen(true)}
          onMouseLeave={() => setOrbitOpen(false)}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`${product.id}-${look?.color}-${mainImage}`}
              className="absolute inset-0"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 30, filter: "blur(12px)" }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.04, filter: "blur(8px)" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              {worn ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={worn} alt={`Mannequin portant ${product.name}${look?.color ? `, coloris ${look.color}` : ""}`} className="h-full w-full object-contain drop-shadow-[0_30px_30px_rgba(30,27,23,.18)]" />
              ) : mainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainImage}
                  alt={product.name}
                  draggable={false}
                  className="h-full w-full rounded-[6px] object-cover shadow-[0_40px_80px_-30px_rgba(30,20,12,.55)] ring-1 ring-white/30"
                />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {!worn && !compact && satellites.length > 0 && (
            <div
              className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${orbitOpen ? "opacity-100" : "opacity-0"}`}
              aria-hidden={!(orbitOpen)}
            >
              {/* Remonté à chaque pièce pour que la rotation et la contre-rotation des vignettes restent en phase. */}
              <div key={product.id} className="absolute inset-0" style={{ animation: reduced ? undefined : "orbit-spin 38s linear infinite" }}>
                {satellites.map((src, i) => {
                  const a = (i / satellites.length) * 360 - 90;
                  return (
                    <div
                      key={src}
                      className="absolute left-1/2 top-1/2 h-0 w-full"
                      style={{ transformOrigin: "0 0", transform: `rotate(${a}deg) translateX(${compact ? 58 : 68}%) rotate(${-a}deg)` }}
                    >
                      <div className="absolute left-0 top-0 w-[30%] -translate-x-1/2 -translate-y-1/2">
                      <div style={{ animation: reduced ? undefined : "orbit-spin 38s linear infinite reverse" }}>
                        <button
                          type="button"
                          onClick={() => setView(src)}
                          className={`pointer-events-auto block w-full overflow-hidden rounded-[4px] shadow-[0_20px_40px_-18px_rgba(30,20,12,.6)] ring-2 ring-white/70 transition-[scale,opacity] duration-700 ease-[var(--ease-cloth)] hover:scale-110 ${
                            orbitOpen ? "scale-100" : "scale-50"
                          }`}
                          style={{ transitionDelay: `${i * 70}ms` }}
                          aria-label={`Voir l'image ${i + 2} de ${product.name}`}
                          tabIndex={orbitOpen ? 0 : -1}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" draggable={false} className="aspect-[4/5] w-full object-cover" />
                        </button>
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pièces en orbite */}
        {items.map((p, i) => {
          const src = p.looks[0]?.cutout ?? p.looks[0]?.gallery;
          return (
            <button
              key={p.id}
              ref={(el) => {
                nodes.current[i] = el;
              }}
              type="button"
              onClick={() => {
                if (!suppressClick.current) select(i);
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => {
                setHovered(i);
                paused.current = true;
              }}
              onBlur={() => {
                setHovered(null);
                paused.current = false;
              }}
              aria-label={`${p.name}, ${formatPrice(p.priceCents)}${i === selected ? " (sélectionné)" : ""}`}
              aria-pressed={i === selected}
              className="absolute left-0 top-0 h-20 w-16 cursor-pointer transition-[filter] will-change-transform md:h-32 md:w-[6.5rem]"
            >
              {src &&
                (p.looks[0]?.cutout ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" draggable={false} className="h-full w-full object-contain drop-shadow-[0_12px_14px_rgba(30,27,23,.22)]" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" draggable={false} className="h-full w-full rounded-[4px] object-cover shadow-[0_14px_24px_-10px_rgba(30,20,12,.5)] ring-1 ring-white/50" />
                ))}
              {i === selected && <span aria-hidden className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-ink" />}
            </button>
          );
        })}

        {/* Étiquette au survol */}
        <AnimatePresence>
          {label && (
            <motion.div
              key={label.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute left-1/2 top-[9%] z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper/90 px-5 py-2 text-sm shadow-sm backdrop-blur"
              aria-hidden
            >
              <span className="font-display text-base">{label.name}</span>
              <span className="ml-3 tabular-nums text-ink-soft">{formatPrice(label.priceCents)}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation manuelle */}
        <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 md:bottom-8">
          <button type="button" onClick={() => select(selected - 1)} className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/20 bg-paper/80 backdrop-blur hover:bg-ink hover:text-paper" aria-label="Pièce précédente">
            <ArrowIcon className="rotate-180" />
          </button>
          <span className="min-w-16 text-center text-xs tabular-nums tracking-widest text-ink-soft" aria-live="polite">
            {String(selected + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </span>
          <button type="button" onClick={() => select(selected + 1)} className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/20 bg-paper/80 backdrop-blur hover:bg-ink hover:text-paper" aria-label="Pièce suivante">
            <ArrowIcon />
          </button>
        </div>
        <p className="absolute bottom-10 left-10 z-40 hidden max-w-[200px] text-[11px] leading-snug text-ink-mute lg:block" aria-hidden>
          Glissez pour faire tourner le cercle. Cliquez une pièce pour la présenter sur le mannequin.
        </p>
      </div>

      {/* Panneau du produit sélectionné */}
      <div className="relative z-50 mx-auto max-w-[1400px] px-5 pb-10 md:max-w-xl lg:absolute lg:bottom-10 lg:right-14 lg:w-[340px] lg:px-0 lg:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[4px] border border-line bg-paper/90 p-5 shadow-[0_20px_60px_-30px_rgba(30,27,23,.4)] backdrop-blur-md"
            aria-live="polite"
            data-testid="orbit-panel"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Pièce sélectionnée</p>
                <h2 className="mt-1 font-display text-2xl">{product.name}</h2>
              </div>
              <p className="tabular-nums">{formatPrice(chosen?.priceCents ?? product.priceCents)}</p>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{product.shortDescription}</p>
            {product.looks.length > 1 && (
              <fieldset className="mt-4">
                <legend className="mb-2 text-xs text-ink-soft">Coloris : {look?.color}</legend>
                <div className="flex gap-2">
                  {product.looks.map((l) => {
                    const hex = productVariants.find((v) => v.color === l.color)?.colorHex ?? "#ccc";
                    return (
                      <button
                        key={l.color}
                        type="button"
                        onClick={() => {
                          setColor(l.color);
                          setSize(null);
                        }}
                        className={`h-7 w-7 rounded-full border-2 ring-1 ring-inset ring-ink/15 transition-transform hover:scale-110 ${look?.color === l.color ? "border-ink" : "border-transparent"}`}
                        style={{ background: hex, boxShadow: "inset 0 0 0 2px var(--paper)" }}
                        aria-label={`Coloris ${l.color}`}
                        aria-pressed={look?.color === l.color}
                      />
                    );
                  })}
                </div>
              </fieldset>
            )}
            {sizes.length > 1 && (
              <fieldset className="mt-4">
                <legend className="mb-2 text-xs text-ink-soft">Taille</legend>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!v.available}
                      onClick={() => setSize(v.size)}
                      aria-pressed={size === v.size}
                      className={`h-9 min-w-10 rounded-full border px-3 text-sm transition-colors disabled:text-ink-mute disabled:line-through ${
                        size === v.size ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
                      }`}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn btn-primary flex-1 !px-4"
                disabled={pending || !product.available || (sizes.length > 1 && !chosen) || (chosen && !chosen.available)}
                onClick={() => {
                  const v = chosen ?? sizes[0];
                  if (v) add(v.id);
                }}
              >
                {!product.available ? "Épuisé" : sizes.length > 1 && !chosen ? "Choisir une taille" : "Ajouter au panier"}
              </button>
              <Link href={`/produits/${product.slug}`} className="btn btn-ghost !px-4" aria-label={`Voir la fiche de ${product.name}`}>
                Fiche
              </Link>
            </div>
            <p className="mt-3 text-[11px] leading-snug text-ink-mute">
              Présentation sur mannequin à partir de visuels préparés{product.isDemo ? " (visuels de démonstration)" : ""}. Ce n&apos;est pas un essayage virtuel.
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
