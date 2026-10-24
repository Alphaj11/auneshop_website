import { useId } from "react";

/** Champ de formulaire avec label, aide et message d'erreur reliés pour l'accessibilité. */
export function Field({
  label,
  name,
  error,
  hint,
  type = "text",
  className = "",
  ...props
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  type?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type">) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {props.required && <span aria-hidden> *</span>}
      </label>
      <input id={id} name={name} type={type} className="field" aria-invalid={!!error} aria-describedby={describedBy} {...props} />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-mute">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ state }: { state: { error?: string; message?: string; ok?: boolean } }) {
  if (state.error)
    return (
      <p role="alert" className="rounded bg-danger/10 px-4 py-3 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.ok && state.message)
    return (
      <p role="status" className="rounded bg-success/10 px-4 py-3 text-sm text-success">
        {state.message}
      </p>
    );
  return null;
}
