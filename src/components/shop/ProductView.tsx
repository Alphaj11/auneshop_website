"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatPrice } from "@/lib/money";
import { toggleWishlist } from "@/app/actions/wishlist";
import { Price } from "@/components/ui/Price";
import { useToast } from "@/components/ui/Toaster";
import { useCart } from "./CartProvider";
import { HeartIcon } from "./Icons";

type Variant = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  priceCents: number;
  stock: number | null;
  available: boolean;
  lowStock: boolean;
};

type Props = {
  product: {
    id: string;
    slug: string;
    name: string;
    shortDescription: string;
    description: string;
    materials: string;
    care: string;
    sizeGuide: string;
    craftStory: string;
    shippingNote: string;
    weightGrams: number;
    priceCents: number;
    compareAtPriceCents: number | null;
    isPreorder: boolean;
    isDemo: boolean;
    isNew: boolean;
    archived: boolean;
  };
  gallery: { url: string; alt: string; color: string | null }[];
  variants: Variant[];
  signedIn: boolean;
  inWishlist: boolean;
  shipping: { delayText: string; preorderText: string; freeThresholdCents: number | null; flatRateCents: number };
  immersiveHref: string | null;
};

export function ProductView({ product, gallery, variants, signedIn, inWishlist: initialWish, shipping, immersiveHref }: Props) {
  const colors = useMemo(() => {
    const list: { name: string; hex: string | null; available: boolean }[] = [];
    for (const v of variants) {
      const c = list.find((x) => x.name === v.color);
      if (c) c.available ||= v.available;
      else list.push({ name: v.color, hex: v.colorHex, available: v.available });
    }
    return list;
  }, [variants]);

  const [color, setColor] = useState(colors.find((c) => c.available)?.name ?? colors[0]?.name ?? "");
  const sizes = variants.filter((v) => v.color === color);
  const singleSize = sizes.length === 1 ? sizes[0] : null;
  const [sizeId, setSizeId] = useState<string | null>(null);
  const selected = singleSize ?? sizes.find((v) => v.id === sizeId) ?? null;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [wish, setWish] = useState(initialWish);
  const [wishPending, startWish] = useTransition();
  const [guideOpen, setGuideOpen] = useState(false);
  const { add, pending } = useCart();
  const toast = useToast();

  const images = useMemo(() => {
    const forColor = gallery.filter((g) => g.color === color || g.color === null);
    return forColor.length ? forColor : gallery;
  }, [gallery, color]);
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);

  const maxQty = selected?.stock != null ? Math.max(1, Math.min(20, selected.stock)) : 20;
  const anyAvailable = variants.some((v) => v.available) && !product.archived;

  const stockLabel = !selected
    ? null
    : !selected.available
      ? { text: "Épuisé dans cette taille", tone: "text-danger" }
      : product.isPreorder || selected.stock === null
        ? { text: "Fabriqué à la commande", tone: "text-ink-soft" }
        : selected.lowStock
          ? { text: `Plus que ${selected.stock} en stock`, tone: "text-terre-ink" }
          : { text: "En stock", tone: "text-success" };

  const onAdd = async () => {
    if (!selected) {
      setSizeError(true);
      return;
    }
    const ok = await add(selected.id, qty);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    }
  };

  return (
    <div className="mx-auto grid max-w-[1600px] gap-10 px-5 pt-6 md:px-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
      {/* Galerie */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col-reverse gap-3 md:flex-row">
          <ul className="no-scrollbar flex gap-2 overflow-x-auto md:w-20 md:flex-col" aria-label="Miniatures">
            {images.map((img, i) => (
              <li key={img.url} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Afficher l'image ${i + 1}`}
                  aria-current={i === active}
                  className={`relative block h-24 w-20 overflow-hidden rounded-[2px] bg-paper-2 transition-opacity ${i === active ? "ring-1 ring-ink" : "opacity-60 hover:opacity-100"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
          <div
            className="relative aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden rounded-[3px] bg-paper-2"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onMouseLeave={() => setZoom(null)}
            onClick={() => setLightbox(true)}
          >
            <AnimatePresence mode="popLayout">
              {current && (
                <motion.img
                  key={current.url}
                  src={current.url}
                  alt={current.alt}
                  className="absolute inset-0 h-full w-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: zoom ? 2 : 1 }}
                  exit={{ opacity: 0 }}
                  style={{ transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center" }}
                  transition={{ opacity: { duration: 0.5 }, scale: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
                />
              )}
            </AnimatePresence>
            <button
              type="button"
              className="absolute bottom-4 right-4 rounded-full bg-paper/90 px-4 py-2 text-xs uppercase tracking-widest"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(true);
              }}
            >
              Agrandir
            </button>
            {product.isDemo && (
              <span className="absolute left-4 top-4 rounded bg-ink/75 px-2 py-1 text-[10px] uppercase tracking-widest text-paper">
                Produit d&apos;exemple
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Informations */}
      <div className="lg:py-6">
        {product.isNew && <p className="eyebrow mb-3 !text-terre-ink">Nouveauté</p>}
        <h1 className="display-lg">{product.name}</h1>
        <p className="mt-4 text-lg">
          <Price cents={selected?.priceCents ?? product.priceCents} compareAt={product.compareAtPriceCents} />
        </p>
        <p className="mt-1 text-xs text-ink-mute">TTC, livraison calculée au panier</p>
        <p className="mt-6 max-w-md leading-relaxed text-ink-soft">{product.shortDescription}</p>

        {product.archived ? (
          <p className="mt-10 rounded bg-paper-2 p-4 text-sm" role="status">
            Cette pièce n&apos;est plus disponible. Découvrez les{" "}
            <Link href="/collections" className="underline">collections actuelles</Link>.
          </p>
        ) : (
          <>
            {colors.length > 0 && (
              <fieldset className="mt-10">
                <legend className="mb-3 text-sm">
                  Coloris : <span className="text-ink-soft">{color}</span>
                </legend>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setColor(c.name);
                        setSizeId(null);
                        setActive(0);
                      }}
                      aria-pressed={color === c.name}
                      aria-label={`${c.name}${c.available ? "" : " (épuisé)"}`}
                      title={c.name}
                      className={`relative h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${color === c.name ? "border-ink" : "border-transparent"} ${!c.available ? "opacity-40" : ""}`}
                    >
                      <span className="absolute inset-[3px] rounded-full ring-1 ring-inset ring-ink/15" style={{ background: c.hex ?? "#ccc" }} />
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {sizes.length > 1 && (
              <fieldset className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <legend className="text-sm">Taille</legend>
                  {product.sizeGuide && (
                    <button type="button" className="link-underline text-sm text-ink-soft" onClick={() => setGuideOpen((o) => !o)} aria-expanded={guideOpen}>
                      Guide des tailles
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {guideOpen && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-4 overflow-hidden whitespace-pre-line rounded bg-paper-2 p-4 text-sm text-ink-soft"
                    >
                      {product.sizeGuide}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Taille" aria-invalid={sizeError}>
                  {sizes.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={sizeId === v.id}
                      disabled={!v.available}
                      onClick={() => {
                        setSizeId(v.id);
                        setSizeError(false);
                        setQty(1);
                      }}
                      className={`h-12 min-w-14 rounded-full border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:text-ink-mute disabled:line-through ${
                        sizeId === v.id ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
                      }`}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>
                {sizeError && (
                  <p className="mt-2 text-sm text-danger" role="alert">
                    Choisissez une taille.
                  </p>
                )}
              </fieldset>
            )}

            <div className="mt-6 min-h-6 text-sm" aria-live="polite">
              {stockLabel && <span className={stockLabel.tone}>● {stockLabel.text}</span>}
            </div>

            <div className="mt-4 flex gap-3">
              <div className="flex items-center rounded-full border border-line">
                <button type="button" className="h-12 w-11 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuer la quantité">
                  −
                </button>
                <label htmlFor="qty" className="sr-only">
                  Quantité
                </label>
                <input
                  id="qty"
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
                  className="w-8 bg-transparent text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" className="h-12 w-11 text-lg" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Augmenter la quantité">
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={onAdd}
                disabled={pending || !anyAvailable || (selected !== null && !selected.available)}
                className="btn btn-primary flex-1"
                data-testid="add-to-cart"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={added ? "ok" : pending ? "p" : "add"} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.25 }}>
                    {!anyAvailable
                      ? "Épuisé"
                      : added
                        ? "Ajouté au panier ✓"
                        : pending
                          ? "Ajout…"
                          : `Ajouter au panier${selected ? ` · ${formatPrice(selected.priceCents * qty)}` : ""}`}
                  </motion.span>
                </AnimatePresence>
              </button>
              <button
                type="button"
                aria-pressed={wish}
                aria-label={wish ? "Retirer des favoris" : "Ajouter aux favoris"}
                disabled={wishPending}
                onClick={() => {
                  if (!signedIn) {
                    toast("Créez un compte ou connectez-vous pour enregistrer vos favoris.", "info");
                    return;
                  }
                  startWish(async () => {
                    const res = await toggleWishlist(product.id);
                    if (res.ok) {
                      setWish(!!res.inWishlist);
                      toast(res.inWishlist ? "Ajouté aux favoris." : "Retiré des favoris.");
                    } else toast(res.error ?? "Erreur", "error");
                  });
                }}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors ${wish ? "border-terre text-terre" : "border-line hover:border-ink"}`}
              >
                <HeartIcon filled={wish} />
              </button>
            </div>
            {product.isPreorder && <p className="mt-4 text-sm text-ink-soft">{shipping.preorderText}</p>}
            {immersiveHref && (
              <Link href={immersiveHref} className="link-underline mt-6 inline-flex items-center gap-2 text-sm">
                Voir cette pièce dans la collection immersive →
              </Link>
            )}
          </>
        )}

        <div className="mt-12 border-t border-line">
          {[
            { title: "Description", body: product.description, open: true },
            { title: "Matières et composition", body: product.materials },
            { title: "Entretien", body: product.care },
            { title: "Fabrication", body: product.craftStory },
            {
              title: "Livraison et retours",
              body: `${shipping.delayText}\n${shipping.freeThresholdCents !== null ? `Livraison ${formatPrice(shipping.flatRateCents)}, offerte dès ${formatPrice(shipping.freeThresholdCents)}.` : ""}\nVous disposez de 14 jours après réception pour exercer votre droit de rétractation (voir conditions).${product.shippingNote ? `\n${product.shippingNote}` : ""}${product.weightGrams ? `\nPoids indicatif : ${product.weightGrams} g.` : ""}`,
            },
          ]
            .filter((s) => s.body.trim())
            .map((s) => (
              <details key={s.title} className="group border-b border-line" open={s.open}>
                <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-sm uppercase tracking-[0.14em]">
                  {s.title}
                  <span className="text-lg transition-transform duration-300 group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="whitespace-pre-line pb-6 leading-relaxed text-ink-soft">{s.body}</p>
              </details>
            ))}
        </div>
      </div>

      <AnimatePresence>
        {lightbox && current && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-paper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Image agrandie"
            onKeyDown={(e) => {
              if (e.key === "Escape") setLightbox(false);
              if (e.key === "ArrowRight") setActive((a) => (a + 1) % images.length);
              if (e.key === "ArrowLeft") setActive((a) => (a - 1 + images.length) % images.length);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.alt} className="max-h-full max-w-full touch-pinch-zoom object-contain" />
            <button type="button" autoFocus onClick={() => setLightbox(false)} className="btn btn-primary absolute right-4 top-4 !min-h-10">
              Fermer
            </button>
            {images.length > 1 && (
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
                <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}>
                  Précédente
                </button>
                <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setActive((a) => (a + 1) % images.length)}>
                  Suivante
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
