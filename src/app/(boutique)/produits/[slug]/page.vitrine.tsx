import { snapshot } from "@/vitrine/store";

export { default, generateMetadata } from "./page.full";

export const dynamicParams = false;
export const generateStaticParams = () => snapshot.products.filter((p) => p.status !== "draft").map((p) => ({ slug: p.slug }));
