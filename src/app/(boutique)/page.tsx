import type { Metadata } from "next";
import { CollectionsList } from "@/components/home/CollectionsList";
import { FeaturedCollection } from "@/components/home/FeaturedCollection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { Hero } from "@/components/home/Hero";
import { PromoBanner } from "@/components/home/PromoBanner";
import { Selection } from "@/components/home/Selection";
import { ScrollStory } from "@/components/atelier/ScrollStory";
import { VOYAGE_MEDIA, VOYAGE_SCRUB, voyageBlocks } from "@/components/home/voyage-config";
import { NewsletterForm } from "@/components/shop/NewsletterForm";
import { Reveal } from "@/components/ui/Reveal";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getCollectionById, getProductCards, listCollections, listProducts, popularProducts } from "@/lib/catalog";
import { getHomepageSections, type HomeSection } from "@/lib/homepage";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ apercu?: string }> }) {
  const { apercu } = await searchParams;
  const user = await getCurrentUser();
  // Prévisualisation du brouillon : réservée aux comptes autorisés à gérer le contenu.
  const preview = apercu === "1" && can(user?.role, "content.manage");
  const [sections, settings] = await Promise.all([getHomepageSections(preview), getSettings()]);
  const rendered = await Promise.all(sections.map((s) => renderSection(s, settings.newsletter.consentText, settings.newsletter.enabled)));

  return (
    <>
      {preview && (
        <div className="fixed inset-x-0 bottom-0 z-[65] bg-vanille px-4 py-3 text-center text-sm">
          Aperçu du brouillon de la page d&apos;accueil, visible uniquement par vous.{" "}
          <a href="/admin/accueil" className="underline">Retour à l&apos;éditeur</a>
        </div>
      )}
      {rendered}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ClothingStore",
            name: settings.store.name,
            url: process.env.APP_URL,
            email: settings.store.email,
            description: settings.seo.defaultDescription,
          }),
        }}
      />
    </>
  );
}

async function renderSection(s: HomeSection, consentText: string, newsletterEnabled: boolean) {
  const c = s.content;
  switch (s.type) {
    case "hero":
      return (
        <Hero
          key={s.id}
          slides={[
            {
              label: "Femme",
              title: "Des pièces qui se nouent, se croisent, se retournent.",
              subtitle: "Robes portefeuille, blouses fluides, pantalons amples : le vestiaire femme en coton tissé artisanalement.",
              imageUrl: c.imageUrl || "/demo/photos/hero.jpg",
              focus: "60% 20%",
              ctaLabel: "Découvrir la femme",
              ctaHref: "/boutique?rayon=femme",
            },
            {
              label: "Homme",
              title: "Des lignes simples, amples et structurées.",
              subtitle: "Chemises à col mao, vestes de travail, t-shirts tissés : le vestiaire homme.",
              imageUrl: "/demo/photos/bastien.jpg",
              focus: "60% 25%",
              ctaLabel: "Découvrir l'homme",
              ctaHref: "/boutique?rayon=homme",
            },
            {
              label: "Notre histoire",
              title: c.title,
              subtitle: c.subtitle,
              imageUrl: "/demo/atelier/fils.jpg",
              focus: "55% center",
              ctaLabel: "Entrer dans l'atelier",
              ctaHref: "/atelier",
            },
          ]}
        />
      );
    case "promo_banner":
      return <PromoBanner key={s.id} text={c.title} href={c.ctaHref} />;
    case "featured_collection": {
      if (!c.collectionId) return null;
      const data = await getCollectionById(c.collectionId);
      if (!data) return null;
      return (
        <FeaturedCollection
          key={s.id}
          eyebrow={c.subtitle}
          title={c.title}
          body={c.body}
          ctaLabel={c.ctaLabel}
          collection={{ ...data.collection, immersive: data.collection.immersiveEnabled }}
          products={data.products}
        />
      );
    }
    case "featured_products": {
      const products = c.productIds?.length ? await getProductCards(c.productIds) : await listProducts({ onlyFeatured: true, limit: 5 });
      return <FeaturedProducts key={s.id} title={c.title} subtitle={c.subtitle} products={products} />;
    }
    case "story":
      // Le voyage d'un vêtement, piloté par le scroll (même principe que la page L'atelier).
      return (
        <ScrollStory
          key={s.id}
          media={VOYAGE_MEDIA}
          scrub={VOYAGE_SCRUB}
          blocks={voyageBlocks(c.title, c.subtitle)}
          label={c.title}
        />
      );
    case "collections": {
      const cols = await listCollections();
      return <CollectionsList key={s.id} title={c.title} subtitle={c.subtitle} collections={cols} />;
    }
    case "selection": {
      const products =
        c.mode === "manual" && c.productIds?.length
          ? await getProductCards(c.productIds)
          : c.mode === "popular"
            ? await popularProducts(8)
            : c.mode === "featured"
              ? await listProducts({ onlyFeatured: true, limit: 8 })
              : await listProducts({ onlyNew: true, limit: 8 });
      return <Selection key={s.id} title={c.title} subtitle={c.subtitle} products={products} />;
    }
    case "newsletter":
      if (!newsletterEnabled) return null;
      return (
        <section key={s.id} className="mx-auto max-w-[1600px] px-5 py-24 md:px-10" aria-labelledby="newsletter-title">
          <div className="grid gap-10 rounded-[3px] bg-terre px-6 py-16 text-paper md:grid-cols-2 md:px-16 md:py-24">
            <Reveal>
              <p className="eyebrow !text-paper/60">Newsletter</p>
              <h2 id="newsletter-title" className="display-lg mt-4">
                {c.title}
              </h2>
              {c.subtitle && <p className="mt-5 max-w-md text-paper/80">{c.subtitle}</p>}
            </Reveal>
            <Reveal delay={0.1} className="flex items-end">
              <NewsletterForm consentText={consentText} source="home" dark />
            </Reveal>
          </div>
        </section>
      );
    default:
      return null;
  }
}
