import "server-only";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { products, productImages, productVariants, collections, collectionProducts, categories } = schema;

export { isVariantAvailable, toCard, type ProductCardData } from "./catalog-shared";
import { toCard, type ProductCardData, type ProductWithRelations } from "./catalog-shared";

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

/** Variantes actives de plusieurs produits (scène immersive des rayons Femme / Homme). */
export async function listVariantsByProduct(ids: string[]) {
  if (!ids.length) return new Map<string, (typeof productVariants.$inferSelect)[]>();
  const rows = await db
    .select()
    .from(productVariants)
    .where(and(inArray(productVariants.productId, ids), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.position));
  const out = new Map<string, (typeof productVariants.$inferSelect)[]>();
  for (const v of rows) out.set(v.productId, [...(out.get(v.productId) ?? []), v]);
  return out;
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

/** Le produit est-il dans les favoris de ce client ? */
export async function isInWishlist(userId: string, productId: string) {
  return !!(await db.query.wishlistItems.findFirst({
    where: and(eq(schema.wishlistItems.userId, userId), eq(schema.wishlistItems.productId, productId)),
  }));
}

export async function listCategories() {
  return db.select().from(categories).orderBy(asc(categories.position));
}
