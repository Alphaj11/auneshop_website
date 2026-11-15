import Full from "./page.full";

export { metadata } from "./page.full";

/** Accueil de la vitrine : la version publiée, sans aperçu de brouillon. */
export default function HomePage() {
  return <Full searchParams={Promise.resolve({})} />;
}
