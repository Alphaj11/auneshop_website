import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionExperience } from "@/components/immersive/CollectionExperience";
import { getCollection, isVariantAvailable } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import type { OrbitVariant } from "@/components/immersive/OrbitScene";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ vue?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCollection(slug);
  if (!data) return { title: "Collection introuvable" };
  const c = data.collection;
  return {
    title: c.seoTitle || c.name,
    description: c.seoDescription || c.description.slice(0, 160),
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { images: c.coverImageUrl && !c.coverImageUrl.endsWith(".svg") ? [c.coverImageUrl] : undefined },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ slug }, { vue }] = await Promise.all([params, searchParams]);
  const [data, settings] = await Promise.all([getCollection(slug), getSettings()]);
  if (!data) notFound();
  const { collection, products, raw } = data;

  const variants: Record<string, OrbitVariant[]> = {};
  for (const p of raw)
    variants[p.id] = p.variants
      .filter((v) => v.isActive)
      .map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex,
        available: isVariantAvailable(v) || (!settings.inventory.preventOverselling && v.isActive),
        priceCents: v.priceCents ?? p.priceCents,
      }));

  const immersiveAllowed = settings.experience.orbitEnabled && collection.immersiveEnabled && products.length >= 3;
  const initialView = !immersiveAllowed || vue === "grille" || collection.displayMode === "grid" ? "grid" : "immersive";

  return (
    <>
      <CollectionExperience
        collection={{ name: collection.name, tagline: collection.tagline, description: collection.description, accentColor: collection.accentColor, isDemo: collection.isDemo }}
        products={products}
        variants={variants}
        immersiveAllowed={immersiveAllowed}
        initialView={initialView}
        mobileDefault={settings.experience.mobileDefault}
        explicitView={vue === "grille" ? "grid" : vue === "immersion" ? "immersive" : null}
        orbitSpeed={settings.experience.orbitSpeed}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: collection.name,
            description: collection.description,
            hasPart: products.map((p) => ({ "@type": "Product", name: p.name, url: `${process.env.APP_URL ?? ""}/produits/${p.slug}` })),
          }),
        }}
      />
    </>
  );
}
