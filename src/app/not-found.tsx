import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="display-lg max-w-xl">Ce fil ne mène nulle part.</h1>
      <p className="text-ink-soft">La page demandée n&apos;existe pas ou plus.</p>
      <div className="flex gap-3">
        <Link href="/" className="btn btn-primary">Accueil</Link>
        <Link href="/collections" className="btn btn-ghost">Collections</Link>
      </div>
    </div>
  );
}
