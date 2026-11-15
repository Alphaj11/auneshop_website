import { snapshot } from "@/vitrine/store";
import Full from "./page.full";

export { generateMetadata } from "./page.full";

export const dynamicParams = false;
export const generateStaticParams = () => snapshot.collections.map((c) => ({ slug: c.slug }));

/** Collection de la vitrine : la vue par défaut (le choix grille / immersion reste dans la page). */
export default function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Full params={params} searchParams={Promise.resolve({})} />;
}
