import type { productImages, productVariants, products } from "@/db/schema";

/** Types et calculs du catalogue sans accès à la base (partagés avec la vitrine statique). */

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  isNew: boolean;
  isPreorder: boolean;
  isDemo: boolean;
  colors: { name: string; hex: string | null }[];
  image: { url: string; alt: string } | null;
  hoverImage: { url: string; alt: string } | null;
  /** Par couleur : visuel détouré et mannequin habillé (scène orbitale). */
  looks: { color: string; cutout: string | null; worn: string | null; gallery: string | null }[];
  /** Toutes les images de galerie, dans l'ordre (images secondaires du mode immersif). */
  gallery: string[];
  available: boolean;
  /** Tailles du premier coloris disponible, pour l'ajout rapide. */
  quick: { variantId: string; size: string; color: string; available: boolean }[];
};

export type ProductWithRelations = typeof products.$inferSelect & {
  images: (typeof productImages.$inferSelect)[];
  variants: (typeof productVariants.$inferSelect)[];
};

export function isVariantAvailable(v: { stock: number; trackInventory: boolean; isActive: boolean }) {
  return v.isActive && (!v.trackInventory || v.stock > 0);
}

export function toCard(p: ProductWithRelations): ProductCardData {
  const gallery = p.images.filter((i) => i.kind === "gallery").sort((a, b) => a.position - b.position);
  const activeVariants = p.variants.filter((v) => v.isActive).sort((a, b) => a.position - b.position);
  const colors: { name: string; hex: string | null }[] = [];
  for (const v of activeVariants) if (!colors.some((c) => c.name === v.color)) colors.push({ name: v.color, hex: v.colorHex });
  const colorNames = colors.length ? colors.map((c) => c.name) : [null];
  const looks = colorNames.map((color) => {
    const pick = (kind: "cutout" | "worn" | "gallery") =>
      p.images.find((i) => i.kind === kind && (color === null || i.color === color))?.url ??
      p.images.find((i) => i.kind === kind)?.url ??
      null;
    return { color: color ?? "", cutout: pick("cutout"), worn: pick("worn"), gallery: pick("gallery") };
  });
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    priceCents: Math.min(p.priceCents, ...activeVariants.map((v) => v.priceCents ?? p.priceCents)),
    compareAtPriceCents: p.compareAtPriceCents,
    isNew: p.isNew,
    isPreorder: p.isPreorder,
    isDemo: p.isDemo,
    colors,
    image: gallery[0] ? { url: gallery[0].url, alt: gallery[0].alt } : null,
    hoverImage: gallery[1] ? { url: gallery[1].url, alt: gallery[1].alt } : null,
    looks,
    gallery: gallery.map((i) => i.url),
    available: activeVariants.some(isVariantAvailable),
    quick: (() => {
      const color = activeVariants.find(isVariantAvailable)?.color ?? activeVariants[0]?.color;
      return activeVariants
        .filter((v) => v.color === color)
        .map((v) => ({ variantId: v.id, size: v.size, color: v.color, available: isVariantAvailable(v) }));
    })(),
  };
}

