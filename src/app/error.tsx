"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Message volontairement générique : aucun détail technique n'est affiché.
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-5 text-center">
      <h1 className="display-lg">Un accroc dans la trame.</h1>
      <p className="text-ink-soft">Une erreur inattendue est survenue. Réessayez dans un instant.</p>
      <button onClick={reset} className="btn btn-primary">Réessayer</button>
    </div>
  );
}
