"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { SUR_MESURE_KEY } from "@/components/atelier/sizing";
import { placeOrder } from "@/app/actions/checkout";
import type { FormState } from "@/app/actions/auth";
import type { CartView } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { Field, FormMessage } from "@/components/ui/Field";
import { countryName } from "@/components/account/AccountForms";

type Address = { id: string; label: string; firstName: string; lastName: string; line1: string; line2: string | null; postalCode: string; city: string; country: string; phone: string | null; isDefault: boolean };

export function CheckoutForm({
  cart,
  user,
  addresses,
  countries,
  shippingMethod,
  delayText,
  paymentMode,
  notice,
  storeName,
}: {
  cart: CartView;
  user: { email: string; firstName: string; lastName: string } | null;
  addresses: Address[];
  countries: string[];
  shippingMethod: string;
  delayText: string;
  paymentMode: "demo" | "stripe_test" | "stripe_live";
  notice: string;
  storeName: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(placeOrder, {});
  const initial = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addrId, setAddrId] = useState(initial?.id ?? "new");
  const a = addresses.find((x) => x.id === addrId);
  const e = state.fieldErrors ?? {};
  const { totals } = cart;
  // Précisions saisies dans l'atelier sur mesure : reprises dans la note pour l'atelier.
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SUR_MESURE_KEY);
      if (saved && noteRef.current && !noteRef.current.value) noteRef.current.value = saved;
    } catch {
      // Stockage indisponible : rien à reprendre.
    }
  }, []);

  return (
    <form action={action} className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]" noValidate>
      <div className="space-y-12">
        {paymentMode !== "stripe_live" && (
          <div className={`rounded border-2 p-4 text-sm ${paymentMode === "demo" ? "border-terre bg-terre/10" : "border-vanille bg-vanille/30"}`} role="note">
            <strong className="block uppercase tracking-widest">
              {paymentMode === "demo" ? "Mode démonstration" : "Stripe en mode test"}
            </strong>
            {paymentMode === "demo"
              ? "Aucun paiement réel ne sera demandé ni encaissé. La commande sera marquée comme commande de test et ne sera jamais expédiée."
              : "Utilisez une carte de test Stripe (ex. 4242 4242 4242 4242). Aucun argent réel n'est débité."}
          </div>
        )}
        <FormMessage state={state} />

        <fieldset className="space-y-5">
          <legend className="display-md mb-6">1. Contact</legend>
          <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={user?.email} error={e.email} hint="Pour la confirmation et le suivi de commande." />
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="display-md mb-6">2. Livraison</legend>
          {addresses.length > 0 && (
            <div>
              <label htmlFor="saved" className="label">Adresse enregistrée</label>
              <select id="saved" className="field" value={addrId} onChange={(ev) => setAddrId(ev.target.value)}>
                {addresses.map((x) => (
                  <option key={x.id} value={x.id}>{x.label} — {x.line1}, {x.city}</option>
                ))}
                <option value="new">Nouvelle adresse</option>
              </select>
            </div>
          )}
          <div key={addrId} className="grid gap-5 sm:grid-cols-2">
            <Field label="Prénom" name="firstName" autoComplete="given-name" required defaultValue={a?.firstName ?? user?.firstName} error={e.firstName} />
            <Field label="Nom" name="lastName" autoComplete="family-name" required defaultValue={a?.lastName ?? user?.lastName} error={e.lastName} />
            <Field label="Adresse" name="line1" autoComplete="address-line1" required defaultValue={a?.line1} error={e.line1} className="sm:col-span-2" />
            <Field label="Complément d'adresse" name="line2" autoComplete="address-line2" defaultValue={a?.line2 ?? ""} className="sm:col-span-2" />
            <Field label="Code postal" name="postalCode" autoComplete="postal-code" required defaultValue={a?.postalCode} error={e.postalCode} />
            <Field label="Ville" name="city" autoComplete="address-level2" required defaultValue={a?.city} error={e.city} />
            <div>
              <label htmlFor="country" className="label">Pays *</label>
              <select id="country" name="country" className="field" defaultValue={a?.country ?? "FR"} autoComplete="country">
                {countries.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
              </select>
              {e.country && <p className="mt-1.5 text-sm text-danger">{e.country}</p>}
            </div>
            <Field label="Téléphone" name="phone" type="tel" autoComplete="tel" defaultValue={a?.phone ?? ""} hint="Utile au transporteur." />
          </div>
          {user && addrId === "new" && (
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="saveAddress" className="h-4 w-4 accent-[var(--terre)]" defaultChecked /> Enregistrer cette adresse dans mon compte
            </label>
          )}
          <div className="rounded border border-line p-4 text-sm">
            <p className="font-medium">{shippingMethod} — {totals.shippingCents ? formatPrice(totals.shippingCents) : "offerte"}</p>
            <p className="mt-1 text-ink-soft">{delayText}</p>
          </div>
          <div>
            <label htmlFor="note" className="label">Note pour l&apos;atelier (facultatif)</label>
            <textarea ref={noteRef} id="note" name="note" rows={3} maxLength={1000} className="field" />
          </div>
        </fieldset>

        <fieldset>
          <legend className="display-md mb-6">3. Paiement</legend>
          <p className="text-sm text-ink-soft">
            {paymentMode === "demo"
              ? "Vous serez redirigé vers une page de paiement simulé."
              : "Vous serez redirigé vers la page de paiement sécurisée Stripe. Vos données bancaires ne transitent jamais par notre serveur."}
          </p>
          {notice && <p className="mt-3 text-sm">{notice}</p>}
        </fieldset>
      </div>

      <aside className="h-fit space-y-6 rounded bg-paper-2 p-6 lg:sticky lg:top-28" aria-label="Récapitulatif">
        <h2 className="eyebrow !text-ink">Récapitulatif</h2>
        <ul className="space-y-4">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex gap-3 text-sm">
              <div className="relative h-16 w-13 shrink-0 overflow-hidden rounded bg-paper">
                {l.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.imageUrl} alt="" className="h-full w-full object-contain p-0.5" />
                )}
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] text-paper">{l.quantity}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{l.name}</p>
                <p className="text-ink-soft">{l.color} / {l.size}</p>
                {l.problem && <p className="text-danger">{l.problem}</p>}
              </div>
              <p className="tabular-nums">{formatPrice(l.unitPriceCents * l.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Sous-total</dt><dd className="tabular-nums">{formatPrice(totals.subtotalCents)}</dd></div>
          {totals.discountCents > 0 && <div className="flex justify-between text-terre-ink"><dt>Réduction ({cart.discountCode})</dt><dd>−{formatPrice(totals.discountCents)}</dd></div>}
          <div className="flex justify-between"><dt>Livraison</dt><dd className="tabular-nums">{totals.shippingCents ? formatPrice(totals.shippingCents) : "Offerte"}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Total TTC</dt><dd className="tabular-nums">{formatPrice(totals.totalCents)}</dd></div>
          <div className="flex justify-between text-xs text-ink-mute"><dt>Dont TVA</dt><dd>{formatPrice(totals.taxCents)}</dd></div>
        </dl>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="terms" className="mt-1 h-4 w-4 accent-[var(--terre)]" aria-invalid={!!e.terms} />
          <span>
            J&apos;ai lu et j&apos;accepte les <Link href="/cgv" target="_blank" className="underline">conditions générales de vente</Link> de {storeName}, y compris les informations sur le droit de rétractation.
          </span>
        </label>
        {e.terms && <p className="text-sm text-danger">{e.terms}</p>}
        <button className="btn btn-primary w-full" disabled={pending || cart.hasProblems} data-testid="place-order">
          {pending ? "Création de la commande…" : paymentMode === "demo" ? "Commander (démonstration)" : "Commander avec obligation de paiement"}
        </button>
        {cart.hasProblems && <p className="text-sm text-danger">Certains articles ne sont plus disponibles. <Link href="/panier" className="underline">Modifier le panier</Link></p>}
      </aside>
    </form>
  );
}
