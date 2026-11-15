import "server-only";
import { snapshot, type VitrineProduct } from "@/vitrine/store";
import { isVariantAvailable, toCard, type ProductCardData } from "./catalog-shared";

/** Catalogue de la vitrine statique : mêmes fonctions que ./catalog, lues dans l'instantané. */

export { isVariantAvailable, toCard, type ProductCardData };

const active = () => snapshot.products.filter((p) => p.status === "active");
const byId = (id: string) => snapshot.products.find((p) => p.id === id);
const time = (d: Date | string) => new Date(d).getTime();

export async function getProductCards(ids: string[]) {
  return ids.map(byId).filter((p): p is VitrineProduct => !!p && p.status === "active").map(toCard);
}

export async function listProducts(opts: {
  categorySlug?: string;
  department?: string;
  search?: string;
  sort?: "new" | "price-asc" | "price-desc";
  onlyNew?: boolean;
  onlyFeatured?: boolean;
  limit?: number;
}) {
  let rows = active();
  if (opts.onlyNew) rows = rows.filter((p) => p.isNew);
  if (opts.onlyFeatured) rows = rows.filter((p) => p.isFeatured);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.shortDescription.toLowerCase().includes(q));
  }
  if (opts.categorySlug || opts.department) {
    const cats = snapshot.categories.filter((c) =>
      opts.categorySlug ? c.slug === opts.categorySlug : c.department === opts.department || c.department === "mixte",
    );
    rows = rows.filter((p) => cats.some((c) => c.id === p.categoryId));
  }
  rows = [...rows].sort((a, b) =>
    opts.sort === "price-asc"
      ? a.priceCents - b.priceCents
      : opts.sort === "price-desc"
        ? b.priceCents - a.priceCents
        : Number(b.isNew) - Number(a.isNew) || time(b.createdAt) - time(a.createdAt),
  );
  return rows.slice(0, opts.limit ?? 60).map(toCard);
}

export async function listVariantsByProduct(ids: string[]) {
  const out = new Map<string, VitrineProduct["variants"]>();
  for (const id of ids) {
    const p = byId(id);
    if (p) out.set(id, p.variants.filter((v) => v.isActive));
  }
  return out;
}

export async function popularProducts(limit = 4) {
  const ids = snapshot.popularIds.slice(0, limit);
  if (ids.length >= 2) return getProductCards(ids);
  return listProducts({ onlyFeatured: true, limit });
}

export async function getProductBySlug(slug: string) {
  return snapshot.products.find((p) => p.slug === slug && p.status !== "draft") ?? null;
}

export async function relatedProducts(productId: string, categoryId: string | null, limit = 4) {
  return active()
    .filter((p) => p.id !== productId && (!categoryId || p.categoryId === categoryId))
    .slice(0, limit)
    .map(toCard);
}

export async function listCollections(includeDraft = false) {
  void includeDraft;
  return snapshot.collections;
}

export async function getCollection(slug: string, opts: { allowDraft?: boolean } = {}) {
  void opts;
  const col = snapshot.collections.find((c) => c.slug === slug);
  if (!col) return null;
  const full = (snapshot.collectionProductIds[col.id] ?? [])
    .map(byId)
    .filter((p): p is VitrineProduct => !!p && p.status === "active");
  return { collection: col, products: full.map(toCard), raw: full };
}

export async function getCollectionById(id: string) {
  const col = snapshot.collections.find((c) => c.id === id);
  return col ? getCollection(col.slug) : null;
}

export async function isInWishlist(userId: string, productId: string) {
  void userId;
  void productId;
  return false;
}

export async function listCategories() {
  return snapshot.categories;
}
