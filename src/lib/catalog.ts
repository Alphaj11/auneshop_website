import "server-only";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { products, productImages, productVariants, collections, collectionProducts, categories } = schema;

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
  available: boolean;
  /** Tailles du premier coloris disponible, pour l'ajout rapide. */
  quick: { variantId: string; size: string; color: string; available: boolean }[];
};

type ProductWithRelations = typeof products.$inferSelect & {
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
    available: activeVariants.some(isVariantAvailable),
    quick: (() => {
      const color = activeVariants.find(isVariantAvailable)?.color ?? activeVariants[0]?.color;
      return activeVariants
        .filter((v) => v.color === color)
        .map((v) => ({ variantId: v.id, size: v.size, color: v.color, available: isVariantAvailable(v) }));
    })(),
  };
}

const withRelations = {
  images: { orderBy: [asc(productImages.position)] },
  variants: { orderBy: [asc(productVariants.position)] },
};

export async function getProductCards(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.query.products.findMany({
    where: and(inArray(products.id, ids), eq(products.status, "active")),
    with: withRelations,
  });
  const byId = new Map(rows.map((r) => [r.id, toCard(r)]));
  return ids.map((id) => byId.get(id)).filter((x): x is ProductCardData => !!x);
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
  const conds = [eq(products.status, "active")];
  if (opts.onlyNew) conds.push(eq(products.isNew, true));
  if (opts.onlyFeatured) conds.push(eq(products.isFeatured, true));
  if (opts.search) {
    const q = `%${opts.search.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
    conds.push(or(ilike(products.name, q), ilike(products.shortDescription, q))!);
  }
  if (opts.categorySlug || opts.department) {
    const cats = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        opts.categorySlug
          ? eq(categories.slug, opts.categorySlug)
          : or(eq(categories.department, opts.department!), eq(categories.department, "mixte")),
      );
    if (!cats.length) return [];
    conds.push(inArray(products.categoryId, cats.map((c) => c.id)));
  }
  const order =
    opts.sort === "price-asc"
      ? [asc(products.priceCents)]
      : opts.sort === "price-desc"
        ? [desc(products.priceCents)]
        : [desc(products.isNew), desc(products.createdAt)];
  const rows = await db.query.products.findMany({
    where: and(...conds),
    with: withRelations,
    orderBy: order,
    limit: opts.limit ?? 60,
  });
  return rows.map(toCard);
}

/** Produits les plus vendus (commandes payées hors test), à défaut les produits à la une. */
export async function popularProducts(limit = 4) {
  const rows = await db
    .select({ id: schema.orderItems.productId, qty: sql<number>`sum(${schema.orderItems.quantity})::int` })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(and(eq(schema.orders.isTest, false), inArray(schema.orders.paymentStatus, ["paid", "partially_refunded"])))
    .groupBy(schema.orderItems.productId)
    .orderBy(desc(sql`sum(${schema.orderItems.quantity})`))
    .limit(limit);
  const ids = rows.map((r) => r.id).filter((x): x is string => !!x);
  if (ids.length >= 2) return getProductCards(ids);
  return listProducts({ onlyFeatured: true, limit });
}

export async function getProductBySlug(slug: string) {
  const row = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), ne(products.status, "draft")),
    with: { ...withRelations, category: true, collections: { with: { collection: true } } },
  });
  return row ?? null;
}

export async function relatedProducts(productId: string, categoryId: string | null, limit = 4) {
  const rows = await db.query.products.findMany({
    where: and(
      eq(products.status, "active"),
      ne(products.id, productId),
      categoryId ? eq(products.categoryId, categoryId) : undefined,
    ),
    with: withRelations,
    limit,
  });
  return rows.map(toCard);
}

export async function listCollections(includeDraft = false) {
  return db.query.collections.findMany({
    where: includeDraft ? undefined : eq(collections.status, "published"),
    orderBy: [asc(collections.position), asc(collections.name)],
  });
}

export async function getCollection(slug: string, opts: { allowDraft?: boolean } = {}) {
  const col = await db.query.collections.findFirst({
    where: and(eq(collections.slug, slug), opts.allowDraft ? undefined : eq(collections.status, "published")),
  });
  if (!col) return null;
  const links = await db
    .select({ productId: collectionProducts.productId })
    .from(collectionProducts)
    .where(eq(collectionProducts.collectionId, col.id))
    .orderBy(asc(collectionProducts.position));
  const ids = links.map((l) => l.productId);
  const rows = ids.length
    ? await db.query.products.findMany({
        where: and(inArray(products.id, ids), eq(products.status, "active")),
        with: withRelations,
      })
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const full = ids.map((id) => byId.get(id)).filter((x): x is ProductWithRelations => !!x);
  return { collection: col, products: full.map(toCard), raw: full };
}

export async function getCollectionById(id: string) {
  const col = await db.query.collections.findFirst({ where: eq(collections.id, id) });
  return col ? getCollection(col.slug) : null;
}

export async function listCategories() {
  return db.select().from(categories).orderBy(asc(categories.position));
}
