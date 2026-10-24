"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatPrice } from "@/lib/money";
import { useCart } from "./CartProvider";

/** Contenu du panier, partagé entre le tiroir et la page /panier. */
export function CartContents({ variant = "drawer" }: { variant?: "drawer" | "page" }) {
  const { cart, update, remove, changeVariant, applyCode, pending, setOpen } = useCart();
  const [code, setCode] = useState("");
  const { totals } = cart;

  if (!cart.lines.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
        <p className="display-md">Votre panier est vide.</p>
        <p className="max-w-xs text-ink-soft">Chaque pièce attend quelqu&apos;un pour prendre vie.</p>
        <Link href="/collections" className="btn btn-primary" onClick={() => setOpen(false)}>
          Découvrir les collections
        </Link>
      </div>
    );
  }

  return (
    <div className={variant === "page" ? "grid gap-12 lg:grid-cols-[1fr_380px]" : "flex min-h-0 flex-1 flex-col"}>
      <ul className={variant === "drawer" ? "-mx-6 flex-1 overflow-y-auto px-6" : ""} aria-label="Articles du panier">
        <AnimatePresence initial={false}>
          {cart.lines.map((line) => {
            const colors = [...new Set(line.options.map((o) => o.color))];
            const sizes = line.options.filter((o) => o.color === line.color);
            return (
              <motion.li
                key={line.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-4 border-b border-line py-5"
              >
                <Link
                  href={`/produits/${line.slug}`}
                  onClick={() => setOpen(false)}
                  className="relative h-28 w-22 shrink-0 overflow-hidden rounded bg-paper-2"
                >
                  {line.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={line.imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain p-1" />
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/produits/${line.slug}`} onClick={() => setOpen(false)} className="font-display text-lg leading-tight">
                      {line.name}
                    </Link>
                    <span className="tabular-nums">{formatPrice(line.unitPriceCents * line.quantity)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {colors.length > 1 ? (
                      <label className="sr-only" htmlFor={`c-${line.id}`}>
                        Couleur
                      </label>
                    ) : null}
                    {colors.length > 1 ? (
                      <select
                        id={`c-${line.id}`}
                        className="rounded border border-line bg-transparent px-2 py-1"
                        value={line.color}
                        disabled={pending}
                        onChange={(e) => {
                          const target =
                            line.options.find((o) => o.color === e.target.value && o.size === line.size && o.available) ??
                            line.options.find((o) => o.color === e.target.value && o.available);
                          if (target) changeVariant(line.id, target.variantId);
                        }}
                      >
                        {colors.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-ink-soft">{line.color}</span>
                    )}
                    {sizes.length > 1 ? (
                      <>
                        <label className="sr-only" htmlFor={`s-${line.id}`}>
                          Taille
                        </label>
                        <select
                          id={`s-${line.id}`}
                          className="rounded border border-line bg-transparent px-2 py-1"
                          value={line.variantId}
                          disabled={pending}
                          onChange={(e) => changeVariant(line.id, e.target.value)}
                        >
                          {sizes.map((o) => (
                            <option key={o.variantId} value={o.variantId} disabled={!o.available && o.variantId !== line.variantId}>
                              {o.size}
                              {!o.available ? " (épuisé)" : ""}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <span className="text-ink-soft">· {line.size}</span>
                    )}
                  </div>
                  {line.isPreorder && <p className="text-xs text-ink-soft">Fabriqué à la commande</p>}
                  {line.problem && (
                    <p className="text-sm text-danger" role="alert">
                      {line.problem}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-line">
                      <button
                        type="button"
                        className="h-9 w-9 rounded-full text-lg disabled:opacity-40"
                        aria-label={`Diminuer la quantité de ${line.name}`}
                        disabled={pending}
                        onClick={() => update(line.id, line.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="w-6 text-center tabular-nums" aria-label="Quantité">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        className="h-9 w-9 rounded-full text-lg disabled:opacity-40"
                        aria-label={`Augmenter la quantité de ${line.name}`}
                        disabled={pending || (line.maxQuantity !== null && line.quantity >= line.maxQuantity) || line.quantity >= 20}
                        onClick={() => update(line.id, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="link-underline text-sm text-ink-soft"
                      onClick={() => remove(line.id)}
                      disabled={pending}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <div className={variant === "drawer" ? "border-t border-line pt-5" : "h-fit rounded-lg bg-paper-2 p-6 lg:sticky lg:top-28"}>
        <form
          className="mb-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await applyCode(code)) setCode("");
          }}
        >
          <label htmlFor={`code-${variant}`} className="sr-only">
            Code de réduction
          </label>
          <input
            id={`code-${variant}`}
            className="field !min-h-10 !py-2 text-sm uppercase"
            placeholder="Code de réduction"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
          />
          <button className="btn btn-ghost !min-h-10 !px-4" disabled={pending || !code.trim()}>
            OK
          </button>
        </form>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Sous-total</dt>
            <dd className="tabular-nums">{formatPrice(totals.subtotalCents)}</dd>
          </div>
          {cart.discountCode && (
            <div className="flex justify-between text-terre-ink">
              <dt>
                Réduction <span className="uppercase">({cart.discountCode})</span>{" "}
                <button type="button" className="ml-1 underline" onClick={() => applyCode("")}>
                  retirer
                </button>
              </dt>
              <dd className="tabular-nums">
                {totals.discountCents ? `−${formatPrice(totals.discountCents)}` : totals.discountApplied ? "Livraison offerte" : "—"}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Livraison estimée</dt>
            <dd className="tabular-nums">{totals.shippingCents ? formatPrice(totals.shippingCents) : "Offerte"}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt className="font-medium">Total TTC</dt>
            <dd className="font-medium tabular-nums">{formatPrice(totals.totalCents)}</dd>
          </div>
          <p className="text-xs text-ink-mute">Dont TVA : {formatPrice(totals.taxCents)}</p>
        </dl>
        {totals.freeShippingRemainingCents !== null && totals.freeShippingRemainingCents > 0 && (
          <p className="mt-3 text-xs text-ink-soft">
            Plus que {formatPrice(totals.freeShippingRemainingCents)} pour la livraison offerte.
          </p>
        )}
        <Link
          href="/commande"
          onClick={() => setOpen(false)}
          aria-disabled={cart.hasProblems}
          className={`btn btn-primary mt-5 w-full ${cart.hasProblems ? "pointer-events-none opacity-50" : ""}`}
        >
          Passer commande
        </Link>
        {cart.hasProblems && (
          <p className="mt-2 text-xs text-danger">Retirez ou modifiez les articles indisponibles pour continuer.</p>
        )}
        {variant === "drawer" && (
          <Link href="/panier" onClick={() => setOpen(false)} className="link-underline mt-3 block text-center text-sm">
            Voir le panier
          </Link>
        )}
      </div>
    </div>
  );
}
