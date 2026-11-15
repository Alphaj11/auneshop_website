/**
 * Instantané du catalogue pour la vitrine statique (GitHub Pages) : produits, collections,
 * catégories, page d'accueil et réglages publics, écrits dans src/vitrine/data.json.
 * Aucune donnée client, commande ou compte n'est exportée.
 *
 *   npm run vitrine:data
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { scriptDb } from "./db";

async function main() {
  const { db, close, schema } = scriptDb();
  const { products, productImages, productVariants, collections, collectionProducts, categories } = schema;

  const productRows = await db.query.products.findMany({
    where: ne(products.status, "draft"),
    with: {
      images: { orderBy: [asc(productImages.position)] },
      variants: { orderBy: [asc(productVariants.position)] },
      category: true,
      collections: { with: { collection: true } },
    },
    orderBy: [desc(products.isNew), desc(products.createdAt)],
  });
  const collectionRows = await db.query.collections.findMany({
    where: eq(collections.status, "published"),
    orderBy: [asc(collections.position), asc(collections.name)],
  });
  const links = await db
    .select({ collectionId: collectionProducts.collectionId, productId: collectionProducts.productId })
    .from(collectionProducts)
    .orderBy(asc(collectionProducts.position));
  const collectionProductIds: Record<string, string[]> = {};
  for (const l of links) (collectionProductIds[l.collectionId] ??= []).push(l.productId);

  const popular = await db
    .select({ id: schema.orderItems.productId })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(and(eq(schema.orders.isTest, false), inArray(schema.orders.paymentStatus, ["paid", "partially_refunded"])))
    .groupBy(schema.orderItems.productId)
    .orderBy(desc(sql`sum(${schema.orderItems.quantity})`))
    .limit(8);

  const settingsRow = await db.query.storeSettings.findFirst({ where: eq(schema.storeSettings.id, 1) });
  const homepage = await db.query.homepageSections.findMany();

  const data = {
    generatedAt: new Date().toISOString(),
    settings: settingsRow?.data ?? null,
    homepage: homepage.map((h) => ({ id: h.id, type: h.type, published: h.published })),
    categories: await db.select().from(categories).orderBy(asc(categories.position)),
    collections: collectionRows,
    collectionProductIds,
    products: productRows.map((p) => ({ ...p, collections: p.collections.filter((c) => c.collection.status === "published") })),
    popularIds: popular.map((p) => p.id).filter((x): x is string => !!x),
  };

  const out = path.resolve("src/vitrine/data.json");
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(data, null, 1) + "\n");
  console.log(`Vitrine : ${data.products.length} produits, ${data.collections.length} collections → ${path.relative(process.cwd(), out)}`);
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
