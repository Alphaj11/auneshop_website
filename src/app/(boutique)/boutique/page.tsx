import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { CollectionExperience } from "@/components/immersive/CollectionExperience";
import type { OrbitVariant } from "@/components/immersive/OrbitScene";
import { isVariantAvailable, listCategories, listProducts, listVariantsByProduct } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

type SP = { categorie?: string; rayon?: string; tri?: string; nouveautes?: string; vue?: string };

const RAYONS = {
  femme: {
    name: "Femme",
    tagline: "Le vestiaire femme",
    description: "Robes portefeuille, blouses fluides, tops réversibles et pantalons amples, en coton tissé artisanalement.",
    accentColor: "#C9A24A",
  },
  homme: {
    name: "Homme",
    tagline: "Le vestiaire homme",
    description: "Chemises à col mao, vestes de travail et t-shirts tissés : des lignes simples, amples et structurées.",
    accentColor: "#2F4A3A",
  },
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const title = sp.rayon === "femme" ? "Femme" : sp.rayon === "homme" ? "Homme" : sp.nouveautes ? "Nouveautés" : "La boutique";
  return { title, alternates: { canonical: sp.rayon ? `/boutique?rayon=${sp.rayon}` : "/boutique" } };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const department = sp.rayon === "femme" || sp.rayon === "homme" ? sp.rayon : undefined;
  const sort = sp.tri === "prix-croissant" ? "price-asc" : sp.tri === "prix-decroissant" ? "price-desc" : "new";
  const [products, categories] = await Promise.all([
    listProducts({ department, categorySlug: sp.categorie, sort, onlyNew: !!sp.nouveautes }),
    listCategories(),
  ]);
  const visibleCats = categories.filter((c) => !department || c.department === department || c.department === "mixte");
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return s ? `/boutique?${s}` : "/boutique";
  };
  const title = department === "femme" ? "Femme" : department === "homme" ? "Homme" : sp.nouveautes ? "Nouveautés" : "La boutique";

  // Rayons Femme / Homme sans filtre : même expérience immersive que les collections.
  if (department && !sp.categorie && !sp.nouveautes && !sp.tri) {
    const settings = await getSettings();
    const byProduct = await listVariantsByProduct(products.map((p) => p.id));
    const variants: Record<string, OrbitVariant[]> = {};
    for (const p of products)
      variants[p.id] = (byProduct.get(p.id) ?? []).map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex,
        available: isVariantAvailable(v) || !settings.inventory.preventOverselling,
        priceCents: v.priceCents ?? p.priceCents,
      }));
    const immersiveAllowed = settings.experience.orbitEnabled && products.length >= 3;
    return (
      <CollectionExperience
        collection={{ ...RAYONS[department], isDemo: false }}
        products={products}
        variants={variants}
        immersiveAllowed={immersiveAllowed}
        initialView={immersiveAllowed && sp.vue !== "grille" ? "immersive" : "grid"}
        mobileDefault={settings.experience.mobileDefault}
        explicitView={sp.vue === "grille" ? "grid" : sp.vue === "immersion" ? "immersive" : null}
        orbitSpeed={settings.experience.orbitSpeed}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-28 md:px-10 md:pt-36">
      <h1 className="display-xl">{title}</h1>
      <div className="mt-10 flex flex-col gap-4 border-y border-line py-4 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Catégories" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 text-sm md:mx-0 md:px-0">
          <Link href={qs({ categorie: undefined })} aria-current={!sp.categorie ? "page" : undefined} className={`whitespace-nowrap rounded-full border px-4 py-2 ${!sp.categorie ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}>
            Tout
          </Link>
          {visibleCats.map((c) => (
            <Link key={c.id} href={qs({ categorie: c.slug })} aria-current={sp.categorie === c.slug ? "page" : undefined} className={`whitespace-nowrap rounded-full border px-4 py-2 ${sp.categorie === c.slug ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}>
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink-soft">{products.length} pièce(s)</span>
          <span aria-hidden className="text-line">|</span>
          <span className="text-ink-soft">Trier :</span>
          {[
            [undefined, "Nouveautés"],
            ["prix-croissant", "Prix ↑"],
            ["prix-decroissant", "Prix ↓"],
          ].map(([v, label]) => (
            <Link key={label} href={qs({ tri: v })} className={(sp.tri ?? undefined) === v ? "underline underline-offset-4" : "link-underline"}>
              {label}
            </Link>
          ))}
        </div>
      </div>
      {products.length === 0 ? (
        <p className="py-24 text-center text-ink-soft">Aucune pièce ne correspond à ces critères.</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 0.05}>
              <ProductCard product={p} priority={i < 4} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
