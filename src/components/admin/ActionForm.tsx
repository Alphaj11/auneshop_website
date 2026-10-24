"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/Toaster";

const PendingContext = createContext(false);

export type ActionResult = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string | undefined> };

/**
 * Formulaire d'administration : appelle une action serveur, affiche une
 * notification de réussite ou d'échec, et une confirmation si demandée.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  resetOnSuccess = false,
  id,
}: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  children: React.ReactNode | ((state: ActionResult) => React.ReactNode);
  className?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.error) toast(state.error, "error");
    else if (state.ok) {
      toast(state.message ?? "Enregistré.");
      if (resetOnSuccess) ref.current?.reset();
    }
  }, [state, toast, resetOnSuccess]);
  return (
    <PendingContext.Provider value={pending}>
      <form
        id={id}
        ref={ref}
        className={className}
        // Envoi manuel : évite la remise à zéro automatique de React, pour ne pas
        // perdre la saisie quand le serveur renvoie une erreur de validation.
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const data = new FormData(e.currentTarget, submitter);
          startTransition(() => formAction(data));
        }}
      >
        {typeof children === "function" ? children(state) : children}
      </form>
    </PendingContext.Provider>
  );
}

export function Submit({
  children,
  className = "btn btn-primary",
  pendingLabel = "Enregistrement…",
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
}) {
  const status = useFormStatus();
  const pending = useContext(PendingContext) || status.pending;
  return (
    <button className={className} disabled={pending} name={name} value={value} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-1 text-sm text-danger">{error}</p> : null;
}
