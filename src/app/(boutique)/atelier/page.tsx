import type { Metadata } from "next";
import { AtelierStory } from "@/components/atelier/AtelierStory";
import { SurMesure, type SurMesureProduct } from "@/components/atelier/SurMesure";
import { isVariantAvailable, listProducts, listVariantsByProduct } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "L'atelier",
  description: "Chaque fil a son histoire : de la matière brute au vêtement, puis votre pièce ajustée sur mesure.",
  alternates: { canonical: "/atelier" },
};

export default async function AtelierPage() {
  const [products, settings] = await Promise.all([listProducts({ limit: 200 }), getSettings()]);
  const variants = await listVariantsByProduct(products.map((p) => p.id));
  const reference: SurMesureProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceCents: p.priceCents,
    image: p.image?.url ?? null,
    variants: (variants.get(p.id) ?? []).map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      available: isVariantAvailable(v) || !settings.inventory.preventOverselling,
    })),
  }));
  return (
    <>
      <AtelierStory />
      <SurMesure products={reference.filter((p) => p.variants.length)} />
    </>
  );
}
