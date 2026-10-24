"use client";

import { useActionState, useId } from "react";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions/newsletter";

export function NewsletterForm({ consentText, source = "site", dark = false }: { consentText: string; source?: string; dark?: boolean }) {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeNewsletter, {});
  const id = useId();
  if (state.ok)
    return (
      <p role="status" className="font-display text-2xl">
        Merci. La première lettre arrive bientôt.
      </p>
    );
  return (
    <form action={action} className="w-full max-w-lg" noValidate>
      <input type="hidden" name="source" value={source} />
      <div className="hidden" aria-hidden>
        <label>
          Ne pas remplir
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={`${id}-email`} className="sr-only">
            Adresse email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Votre adresse email"
            className={`field ${dark ? "!border-paper/30 !bg-transparent !text-paper placeholder:text-paper/60" : ""}`}
            aria-invalid={!!state.fieldErrors?.email}
            aria-describedby={state.fieldErrors?.email ? `${id}-email-err` : undefined}
          />
        </div>
        <button className={`btn ${dark ? "btn-light" : "btn-primary"}`} disabled={pending}>
          {pending ? "Envoi…" : "S'inscrire"}
        </button>
      </div>
      {state.fieldErrors?.email && (
        <p id={`${id}-email-err`} className="mt-2 text-sm text-danger">
          {state.fieldErrors.email}
        </p>
      )}
      <label className={`mt-4 flex items-start gap-3 text-xs leading-relaxed ${dark ? "text-paper/75" : "text-ink-soft"}`}>
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--terre)]" aria-invalid={!!state.fieldErrors?.consent} />
        <span>{consentText}</span>
      </label>
      {state.fieldErrors?.consent && <p className="mt-2 text-sm text-danger">{state.fieldErrors.consent}</p>}
      {state.error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
