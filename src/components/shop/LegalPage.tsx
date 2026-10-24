export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-5 pb-10 pt-32 md:pt-40">
      <h1 className="display-lg">{title}</h1>
      {updated && <p className="mt-3 text-sm text-ink-mute">Dernière mise à jour : {updated}</p>}
      <p className="mt-6 rounded border border-vanille bg-vanille/25 p-4 text-sm">
        Modèle de texte fourni à titre indicatif. Il doit être complété et validé (idéalement par un professionnel du droit) selon l&apos;activité réelle de la boutique avant la mise en production.
      </p>
      <div className="mt-10 space-y-6 leading-relaxed text-ink-soft [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink [&_strong]:text-ink">
        {children}
      </div>
    </article>
  );
}
