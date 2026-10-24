"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, requestPasswordReset, resetPassword, type FormState } from "@/app/actions/auth";
import { Field, FormMessage } from "@/components/ui/Field";

export function LoginForm({ next, area }: { next?: string; area?: "admin" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {area && <input type="hidden" name="area" value={area} />}
      <FormMessage state={state} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required error={state.fieldErrors?.password} />
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      {!area && (
        <p className="text-center text-sm">
          <Link href="/mot-de-passe-oublie" className="link-underline text-ink-soft">
            Mot de passe oublié ?
          </Link>
        </p>
      )}
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Prénom" name="firstName" autoComplete="given-name" required error={e.firstName} />
        <Field label="Nom" name="lastName" autoComplete="family-name" required error={e.lastName} />
      </div>
      <Field label="Email" name="email" type="email" autoComplete="email" required error={e.email} />
      <Field label="Mot de passe" name="password" type="password" autoComplete="new-password" required error={e.password} hint="10 caractères minimum, avec au moins une lettre et un chiffre." />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" className="mt-1 h-4 w-4 accent-[var(--terre)]" aria-invalid={!!e.terms} />
        <span>
          J&apos;accepte les <Link href="/cgv" className="underline" target="_blank">conditions générales de vente</Link> et j&apos;ai lu la{" "}
          <Link href="/confidentialite" className="underline" target="_blank">politique de confidentialité</Link>.
        </span>
      </label>
      {e.terms && <p className="text-sm text-danger">{e.terms}</p>}
      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input type="checkbox" name="marketing" className="mt-1 h-4 w-4 accent-[var(--terre)]" />
        <span>Je souhaite recevoir la newsletter (facultatif, désinscription à tout moment).</span>
      </label>
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="Email du compte" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir un lien"}
      </button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, {});
  if (state.ok)
    return (
      <div className="space-y-5">
        <FormMessage state={state} />
        <Link href="/connexion" className="btn btn-primary w-full">Se connecter</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" required error={state.fieldErrors?.password} hint="10 caractères minimum, avec au moins une lettre et un chiffre." />
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
