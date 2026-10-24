import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ProductView } from "@/components/shop/ProductView";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { getCurrentUser } from "@/lib/auth/session";
import { getProductBySlug, isVariantAvailable, relatedProducts, getCollection } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Produit introuvable" };
  const img = p.images.find((i) => i.kind === "gallery");
  return {
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.shortDescription,
    alternates: { canonical: `/produits/${p.slug}` },
    robots: p.status === "archived" ? { index: false } : undefined,
    openGraph: { images: img && !img.url.endsWith(".svg") ? [img.url] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, settings, user] = await Promise.all([getProductBySlug(slug), getSettings(), getCurrentUser()]);
  if (!product) notFound();

  const inWishlist = user
    ? !!(await db.query.wishlistItems.findFirst({
        where: and(eq(schema.wishlistItems.userId, user.id), eq(schema.wishlistItems.productId, product.id)),
      }))
    : false;

  const collections = product.collections.map((c) => c.collection).filter((c) => c.status === "published");
  const immersive = collections.find((c) => c.immersiveEnabled && c.displayMode === "immersive" && settings.experience.orbitEnabled);
  const [related, sameCollection] = await Promise.all([
    relatedProducts(product.id, product.categoryId, 4),
    collections[0] ? getCollection(collections[0].slug).then((d) => d?.products.filter((p) => p.id !== product.id).slice(0, 4) ?? []) : [],
  ]);

  const variants = product.variants
    .filter((v) => v.isActive)
    .map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      priceCents: v.priceCents ?? product.priceCents,
      stock: v.trackInventory ? v.stock : null,
      available: product.status === "active" && (isVariantAvailable(v) || !settings.inventory.preventOverselling),
      lowStock: v.trackInventory && v.stock > 0 && v.stock <= v.lowStockThreshold,
    }));

  const gallery = product.images.filter((i) => i.kind === "gallery").map((i) => ({ url: i.url, alt: i.alt, color: i.color }));
  const firstImage = gallery[0]?.url;
  const offerAvailable = variants.some((v) => v.available);

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mx-auto max-w-[1600px] px-5 pt-24 text-xs text-ink-soft md:px-10 md:pt-28">
        <ol className="flex flex-wrap gap-2">
          <li><Link href="/" className="link-underline">Accueil</Link> /</li>
          {collections[0] ? (
            <li><Link href={`/collections/${collections[0].slug}`} className="link-underline">{collections[0].name}</Link> /</li>
          ) : product.category ? (
            <li><Link href={`/boutique?categorie=${product.category.slug}`} className="link-underline">{product.category.name}</Link> /</li>
          ) : null}
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <ProductView
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          shortDescription: product.shortDescription,
          description: product.description,
          materials: product.materials,
          care: product.care,
          sizeGuide: product.sizeGuide,
          craftStory: product.craftStory,
          shippingNote: product.shippingNote,
          weightGrams: product.weightGrams,
          compareAtPriceCents: product.compareAtPriceCents,
          priceCents: product.priceCents,
          isPreorder: product.isPreorder,
          isDemo: product.isDemo,
          isNew: product.isNew,
          archived: product.status === "archived",
        }}
        gallery={gallery}
        variants={variants}
        signedIn={!!user}
        inWishlist={inWishlist}
        shipping={{ delayText: settings.shipping.delayText, preorderText: settings.shipping.preorderText, freeThresholdCents: settings.shipping.freeThresholdCents, flatRateCents: settings.shipping.flatRateCents }}
        immersiveHref={immersive ? `/collections/${immersive.slug}?vue=immersion` : null}
      />

      {sameCollection.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-5 pt-28 md:px-10" aria-labelledby="same-collection">
          <Reveal>
            <p className="eyebrow">De la même collection</p>
            <h2 id="same-collection" className="display-md mt-3">{collections[0].name}</h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {sameCollection.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}><ProductCard product={p} /></Reveal>
            ))}
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-5 pt-24 md:px-10" aria-labelledby="related">
          <Reveal>
            <p className="eyebrow">À associer</p>
            <h2 id="related" className="display-md mt-3">Vous aimerez aussi</h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}><ProductCard product={p} /></Reveal>
            ))}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.shortDescription,
            sku: product.variants[0]?.sku,
            image: firstImage ? [`${process.env.APP_URL ?? ""}${firstImage}`] : undefined,
            brand: { "@type": "Brand", name: settings.store.name },
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "EUR",
              lowPrice: (Math.min(...variants.map((v) => v.priceCents), product.priceCents) / 100).toFixed(2),
              highPrice: (Math.max(...variants.map((v) => v.priceCents), product.priceCents) / 100).toFixed(2),
              offerCount: variants.length,
              availability: product.status === "archived" ? "https://schema.org/Discontinued" : offerAvailable ? (product.isPreorder ? "https://schema.org/PreOrder" : "https://schema.org/InStock") : "https://schema.org/OutOfStock",
            },
          }),
        }}
      />
    </>
  );
}
