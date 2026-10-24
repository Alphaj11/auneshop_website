"use client";

import { useActionState, useState } from "react";
import { changePassword, type FormState } from "@/app/actions/auth";
import { deleteAccount, deleteAddress, saveAddress, sendInquiry, updateProfile } from "@/app/actions/account";
import { Field, FormMessage } from "@/components/ui/Field";

export function ProfileForm({ initial }: { initial: { firstName: string; lastName: string; phone: string; marketing: boolean; email: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid max-w-xl gap-5 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Prénom" name="firstName" defaultValue={initial.firstName} autoComplete="given-name" required error={e.firstName} />
      <Field label="Nom" name="lastName" defaultValue={initial.lastName} autoComplete="family-name" required error={e.lastName} />
      <Field label="Email" name="emailDisplay" defaultValue={initial.email} disabled hint="Pour modifier votre email, contactez-nous." />
      <Field label="Téléphone" name="phone" type="tel" defaultValue={initial.phone} autoComplete="tel" />
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input type="checkbox" name="marketing" defaultChecked={initial.marketing} className="mt-1 h-4 w-4 accent-[var(--terre)]" />
        Je souhaite recevoir la newsletter.
      </label>
      <div><button className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="grid max-w-xl gap-5" noValidate>
      <FormMessage state={state} />
      <Field label="Mot de passe actuel" name="current" type="password" autoComplete="current-password" error={state.fieldErrors?.current} />
      <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" error={state.fieldErrors?.password} hint="10 caractères minimum, avec au moins une lettre et un chiffre." />
      <div><button className="btn btn-ghost" disabled={pending}>Changer le mot de passe</button></div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {});
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="link-underline text-sm text-danger" onClick={() => setOpen(true)}>
        Supprimer mon compte
      </button>
    );
  return (
    <form action={action} className="max-w-xl space-y-4 rounded border border-danger/30 p-5">
      <p className="text-sm">
        Vos données personnelles (profil, adresses, favoris) seront effacées. Vos commandes sont conservées de façon détachée, pour nos obligations comptables. Cette action est définitive.
      </p>
      <FormMessage state={state} />
      <Field label="Confirmez avec votre mot de passe" name="password" type="password" autoComplete="current-password" error={state.fieldErrors?.password} />
      <div className="flex gap-3">
        <button className="btn bg-danger text-white" disabled={pending}>Supprimer définitivement</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
      </div>
    </form>
  );
}

type Address = { id: string; label: string; firstName: string; lastName: string; line1: string; line2: string | null; postalCode: string; city: string; country: string; phone: string | null; isDefault: boolean };

export function AddressForm({ address, countries, onDone }: { address?: Address; countries: string[]; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev: FormState, fd: FormData) => {
    const res = await saveAddress(prev, fd);
    if (res.ok) onDone?.();
    return res;
  }, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Nom de l'adresse" name="label" defaultValue={address?.label ?? "Domicile"} className="sm:col-span-2" />
      <Field label="Prénom" name="firstName" defaultValue={address?.firstName} required error={e.firstName} autoComplete="given-name" />
      <Field label="Nom" name="lastName" defaultValue={address?.lastName} required error={e.lastName} autoComplete="family-name" />
      <Field label="Adresse" name="line1" defaultValue={address?.line1} required error={e.line1} autoComplete="address-line1" className="sm:col-span-2" />
      <Field label="Complément" name="line2" defaultValue={address?.line2 ?? ""} autoComplete="address-line2" className="sm:col-span-2" />
      <Field label="Code postal" name="postalCode" defaultValue={address?.postalCode} required error={e.postalCode} autoComplete="postal-code" />
      <Field label="Ville" name="city" defaultValue={address?.city} required error={e.city} autoComplete="address-level2" />
      <div>
        <label className="label" htmlFor="country">Pays</label>
        <select id="country" name="country" className="field" defaultValue={address?.country ?? "FR"}>
          {countries.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
        </select>
        {e.country && <p className="mt-1.5 text-sm text-danger">{e.country}</p>}
      </div>
      <Field label="Téléphone" name="phone" type="tel" defaultValue={address?.phone ?? ""} autoComplete="tel" />
      <label className="flex items-center gap-3 text-sm sm:col-span-2">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="h-4 w-4 accent-[var(--terre)]" /> Adresse par défaut
      </label>
      <div><button className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer l'adresse"}</button></div>
    </form>
  );
}

export function AddressCard({ address, countries }: { address: Address; countries: string[] }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <div className="rounded border border-line p-5"><AddressForm address={address} countries={countries} onDone={() => setEditing(false)} /></div>;
  return (
    <div className="rounded border border-line p-5 text-sm">
      <p className="font-medium">{address.label} {address.isDefault && <span className="ml-2 rounded-full bg-paper-2 px-2 py-0.5 text-xs">Par défaut</span>}</p>
      <p className="mt-2 leading-relaxed text-ink-soft">
        {address.firstName} {address.lastName}<br />{address.line1}<br />{address.line2 && <>{address.line2}<br /></>}{address.postalCode} {address.city}<br />{countryName(address.country)}
      </p>
      <div className="mt-4 flex gap-4">
        <button type="button" className="link-underline" onClick={() => setEditing(true)}>Modifier</button>
        <button type="button" className="link-underline text-danger" onClick={() => confirm("Supprimer cette adresse ?") && deleteAddress(address.id)}>Supprimer</button>
      </div>
    </div>
  );
}

export function InquiryForm({ orderId, name, email, subject }: { orderId?: string; name?: string; email?: string; subject?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendInquiry, {});
  const e = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input type="hidden" name="orderId" value={orderId ?? ""} />
      <div className="hidden" aria-hidden><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Nom" name="name" defaultValue={name} required error={e.name} autoComplete="name" />
      <Field label="Email" name="email" type="email" defaultValue={email} required error={e.email} autoComplete="email" />
      <Field label="Objet" name="subject" defaultValue={subject} required error={e.subject} className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <label htmlFor="message" className="label">Message *</label>
        <textarea id="message" name="message" rows={5} className="field" aria-invalid={!!e.message} />
        {e.message && <p className="mt-1.5 text-sm text-danger">{e.message}</p>}
      </div>
      <div><button className="btn btn-primary" disabled={pending}>{pending ? "Envoi…" : "Envoyer"}</button></div>
    </form>
  );
}

export function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
