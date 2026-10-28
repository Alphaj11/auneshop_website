"use client";

import { useMemo, useRef, useState } from "react";

import { formatPrice } from "@/lib/money";
import { useCart } from "@/components/shop/CartProvider";
import { recommendSize, SUR_MESURE_KEY } from "./sizing";

export type SurMesureProduct = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  image: string | null;
  variants: { id: string; size: string; color: string; colorHex: string | null; available: boolean }[];
};

const H = { min: 145, max: 200, step: 1, initial: 168 };
const W = { min: 40, max: 130, step: 1, initial: 62 };

/**
 * Jauge verticale accessible : rôle « slider », flèches / Page / Début / Fin au clavier,
 * glisser à la souris ou au doigt. Un fil se tend du bas jusqu'à la valeur choisie.
 */
function Gauge({
  id,
  label,
  unit,
  value,
  range,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (v: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const pct = ((value - range.min) / (range.max - range.min)) * 100;
  const clamp = (v: number) => Math.min(range.max, Math.max(range.min, Math.round(v / range.step) * range.step));
  const fromPointer = (clientY: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    onChange(clamp(range.max - ((clientY - r.top) / r.height) * (range.max - range.min)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    const big = (range.max - range.min) / 10;
    const next: Record<string, number> = {
      ArrowUp: value + range.step,
      ArrowRight: value + range.step,
      ArrowDown: value - range.step,
      ArrowLeft: value - range.step,
      PageUp: value + big,
      PageDown: value - big,
      Home: range.min,
      End: range.max,
    };
    if (e.key in next) {
      e.preventDefault();
      onChange(clamp(next[e.key]));
    }
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <span id={`${id}-label`} className="eyebrow">
        {label}
      </span>
      <p className="font-display text-3xl tabular-nums" aria-hidden>
        {value}
        <span className="ml-1 text-base text-ink-soft">{unit}</span>
      </p>
      <div
        ref={track}
        className="relative h-56 w-14 cursor-ns-resize touch-none md:h-72"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e.clientY);
        }}
        onPointerMove={(e) => e.buttons && fromPointer(e.clientY)}
      >
        {/* Graduations : un fil tendu avec ses repères */}
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line" />
        {[0, 25, 50, 75, 100].map((t) => (
          <span key={t} aria-hidden className="absolute left-1/2 h-px w-3 -translate-x-1/2 bg-line" style={{ bottom: `${t}%` }} />
        ))}
        <span aria-hidden className="absolute bottom-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-terre-ink" style={{ height: `${pct}%` }} />
        <span
          id={id}
          role="slider"
          tabIndex={0}
          aria-labelledby={`${id}-label`}
          aria-valuemin={range.min}
          aria-valuemax={range.max}
          aria-valuenow={value}
          aria-valuetext={`${value} ${unit === "cm" ? "centimètres" : "kilos"}`}
          aria-orientation="vertical"
          onKeyDown={onKey}
          className="absolute left-1/2 h-7 w-7 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-ink bg-paper shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terre"
          style={{ bottom: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Commande sur mesure : jauges de taille et de poids à gauche, mannequin au centre (il
 * s'ajuste à la silhouette), pièce de référence à droite, précisions de commande en dessous.
 * Les précisions rejoignent la note de commande (reprise automatiquement au paiement).
 */
export function SurMesure({ products }: { products: SurMesureProduct[] }) {
  const { add, pending } = useCart();
  const [height, setHeight] = useState(H.initial);
  const [weight, setWeight] = useState(W.initial);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [color, setColor] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  const product = products.find((p) => p.id === productId) ?? products[0];
  const colors = useMemo(() => {
    const seen = new Map<string, string | null>();
    product?.variants.forEach((v) => seen.set(v.color, v.colorHex));
    return [...seen.entries()];
  }, [product]);
  const activeColor = color && colors.some(([c]) => c === color) ? color : colors[0]?.[0];
  const sizes = product ? [...new Set(product.variants.filter((v) => v.color === activeColor).map((v) => v.size))] : [];
  const size = recommendSize(height, weight, sizes);
  const variant = product?.variants.find((v) => v.color === activeColor && v.size === size);

  // Silhouette : la hauteur suit la taille, la largeur suit en plus la corpulence (IMC relatif à 22).
  // La photo n'est jamais réduite (ses bords resteraient visibles dans l'arche) : de 1 à 1,25.
  const bmi = weight / (height / 100) ** 2;
  const sy = 1 + ((height - H.min) / (H.max - H.min)) * 0.25;
  const sx = sy * Math.min(1.3, Math.max(1, 0.75 + Math.sqrt(bmi / 22) * 0.35));

  if (!product) return null;

  const summary = [
    `Sur mesure — ${product.name}`,
    `Taille ${height} cm, poids ${weight} kg → taille conseillée ${size ?? "à confirmer"}`,
    `Coloris : ${activeColor ?? "à confirmer"}`,
    notes.trim() && `Précisions : ${notes.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const order = async () => {
    if (!variant) return;
    try {
      sessionStorage.setItem(SUR_MESURE_KEY, summary);
    } catch {
      // Stockage indisponible : la note de commande reste à saisir à la main.
    }
    if (await add(variant.id)) setAdded(true);
  };

  return (
    <section className="bg-paper-2 py-14 md:py-20" aria-labelledby="sur-mesure-titre">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr] md:items-end">
          <div>
            <p className="eyebrow">L&apos;atelier sur mesure</p>
            <h2 id="sur-mesure-titre" className="display-lg mt-3">
              Une pièce ajustée <em>à votre silhouette.</em>
            </h2>
          </div>
          <p className="text-ink-soft">
            Choisissez une pièce, indiquez votre taille et votre poids : nous vous conseillons une taille, et vous pouvez
            préciser vos mesures (longueur de jambe, tour de taille, poitrine…) pour que l&apos;atelier ajuste la coupe.
          </p>
        </div>

        <div className="mt-10 grid items-center gap-8 md:grid-cols-[auto_1fr_minmax(0,20rem)] md:gap-10">
          {/* Jauges, côte à côte */}
          <div className="flex justify-center gap-8">
            <Gauge id="sm-taille" label="Taille" unit="cm" value={height} range={H} onChange={setHeight} />
            <Gauge id="sm-poids" label="Poids" unit="kg" value={weight} range={W} onChange={setWeight} />
          </div>

          {/* Mannequin de couture (photo) dans une arche : il s'ajuste à la silhouette. */}
          <div className="relative mx-auto h-[26rem] w-[16rem] md:h-[32rem] md:w-[19rem]" aria-hidden>
            <div className="absolute inset-0 overflow-hidden rounded-t-full bg-gradient-to-b from-[#a9a9a9] via-[#cfcfcf] to-[#dcdcdc] shadow-[inset_0_0_40px_rgba(0,0,0,.18)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/media/atelier/mannequin.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  transform: `scale(${sx}, ${sy})`,
                  transformOrigin: "50% 100%",
                  transition: "transform 0.45s var(--ease-cloth)",
                }}
              />
            </div>
            <span className="absolute -bottom-3 left-1/2 h-4 w-40 -translate-x-1/2 rounded-[50%] bg-ink/20 blur-md" />
          </div>

          {/* Pièce de référence */}
          <div className="rounded-[4px] border border-line bg-paper/70 p-5">
            <label htmlFor="sm-piece" className="eyebrow">
              Pièce de référence
            </label>
            <select
              id="sm-piece"
              value={product.id}
              onChange={(e) => {
                setProductId(e.target.value);
                setColor(null);
                setAdded(false);
              }}
              className="field mt-2"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatPrice(p.priceCents)}
                </option>
              ))}
            </select>
            <div className="mt-4 aspect-[4/5] overflow-hidden rounded-[3px] bg-paper-3">
              {product.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <a href={`/produits/${product.slug}`} className="font-display text-2xl link-underline">
                {product.name}
              </a>
              <span className="tabular-nums">{formatPrice(product.priceCents)}</span>
            </div>
          </div>
        </div>

        {/* Précisions de la commande */}
        <div className="mt-10 grid gap-8 border-t border-line pt-8 md:grid-cols-4">
          <div>
            <p className="eyebrow">Taille conseillée</p>
            <p className="mt-2 font-display text-4xl">{size ?? "—"}</p>
            <p className="mt-1 text-xs text-ink-mute">Indicative : l&apos;atelier confirme vos mesures avant de coudre.</p>
          </div>
          <fieldset>
            <legend className="eyebrow">Coloris</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {colors.map(([c, hex]) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={c === activeColor}
                  className={`flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm ${c === activeColor ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}
                >
                  <span className="h-4 w-4 rounded-full ring-1 ring-ink/20" style={{ background: hex ?? "#ccc" }} />
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="md:col-span-2">
            <label htmlFor="sm-notes" className="eyebrow">
              Vos mesures et souhaits
            </label>
            <textarea
              id="sm-notes"
              rows={3}
              maxLength={600}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex. longueur de jambe 78 cm, tour de taille 70 cm, manches un peu plus longues…"
              className="field mt-2"
            />
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-sm text-ink-soft">
            Fabriqué en précommande : commandé entre le 1er et le 25 du mois, livré avant le 5 du mois suivant. Vos
            précisions sont jointes à la commande dans la note pour l&apos;atelier.
          </p>
          <button type="button" className="btn btn-primary" disabled={pending || !variant} onClick={order}>
            {added ? "Ajouté au panier" : `Commander en ${size ?? "—"}`}
          </button>
        </div>
      </div>
    </section>
  );
}
