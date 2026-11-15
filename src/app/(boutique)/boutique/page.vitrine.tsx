import type { Metadata } from "next";
import { QueryVariants } from "@/components/vitrine/QueryVariants";
import { snapshot } from "@/vitrine/store";
import Full from "./page.full";

export const metadata: Metadata = { title: "La boutique" };

/** Boutique de la vitrine : rayons, nouveautés et catégories rendus à l'avance. */
export default function ShopPage() {
  const view = (sp: Record<string, string>) => <Full searchParams={Promise.resolve(sp)} />;
  const variants: { when: Record<string, string>; node: React.ReactNode }[] = [
    ...snapshot.categories.map((c) => ({ when: { categorie: c.slug }, node: view({ categorie: c.slug }) })),
    { when: { rayon: "femme" }, node: view({ rayon: "femme" }) },
    { when: { rayon: "homme" }, node: view({ rayon: "homme" }) },
    { when: { nouveautes: "1" }, node: view({ nouveautes: "1" }) },
  ];
  return <QueryVariants variants={variants} fallback={view({})} />;
}
