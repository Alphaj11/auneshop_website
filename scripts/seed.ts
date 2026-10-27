/**
 * Remplit la base avec le catalogue de DÉMONSTRATION.
 *
 *   npm run db:seed            (refuse si la base contient déjà des produits)
 *   npm run db:seed -- --reset (vide toutes les tables puis recharge la démo)
 *
 * Sécurités :
 * - refuse de s'exécuter si NODE_ENV=production (sauf --allow-production) ;
 * - ne crée AUCUN compte administrateur (voir npm run admin:create) ;
 * - les commandes créées sont marquées is_test = true et payment_mode = demo :
 *   elles ne déclenchent jamais d'expédition ni de remboursement réel.
 */
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { sql } from "drizzle-orm";
import { defaultSettings } from "../src/lib/settings-schema";
import type { HomepageSectionContent } from "../src/db/schema";
import { scriptDb } from "./db";
import { categories, collections, colorSlug, products } from "./demo-catalog";
import { pagePhotos, photoUrl, productPhotos } from "./demo-photos";

const args = process.argv.slice(2);
const reset = args.includes("--reset");

if (process.env.NODE_ENV === "production" && !args.includes("--allow-production")) {
  console.error("Refus : le seed de démonstration ne s'exécute pas en production.");
  process.exit(1);
}

/** Générateur pseudo-aléatoire déterministe (stocks reproductibles). */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const rand = rng(42);

const sizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

async function main() {
  const { db, close, schema } = scriptDb();

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.products);
  if (count > 0 && !reset) {
    console.error("La base contient déjà des produits. Relancez avec --reset pour tout effacer.");
    await close();
    process.exit(1);
  }

  if (reset) {
    const tables = [
      "audit_logs", "order_events", "shipments", "payments", "order_items", "orders", "inventory_movements",
      "cart_items", "carts", "wishlist_items", "collection_products", "collections", "product_images",
      "product_variants", "products", "categories", "discounts", "homepage_sections", "newsletter_subscribers",
      "store_settings", "inquiries", "webhook_events", "rate_limits", "sessions", "password_reset_tokens",
      "addresses", "customer_profiles", "users",
    ];
    await db.execute(sql.raw(`TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`));
    await db.execute(sql`ALTER SEQUENCE order_number_seq RESTART WITH 100001`);
    console.log("Tables vidées.");
  }

  await db.insert(schema.storeSettings).values({ id: 1, data: defaultSettings });

  // Catégories
  const catIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const [row] = await db.insert(schema.categories).values({ ...c, position: i }).returning();
    catIds.set(c.slug, row.id);
  }

  // Produits, variantes, images
  const productIds = new Map<string, string>();
  const variantsBySlug = new Map<string, { id: string; size: string; color: string; sku: string; price: number }[]>();
  for (const p of products) {
    const [row] = await db
      .insert(schema.products)
      .values({
        slug: p.slug,
        name: p.name,
        shortDescription: p.short,
        description: p.description,
        categoryId: catIds.get(p.category),
        status: p.status ?? "active",
        priceCents: p.priceCents,
        compareAtPriceCents: p.compareAtPriceCents ?? null,
        isFeatured: !!p.featured,
        isNew: !!p.isNew,
        isPreorder: !!p.preorder,
        materials: p.materials,
        care: "",
        sizeGuide: p.sizes.length > 1 ? `Tailles disponibles : ${p.sizes.join(" · ")}.` : "Taille unique.",
        craftStory: "",
        weightGrams: p.weightGrams,
        shippingNote: p.preorder ? "Pièce fabriquée à la commande." : "",
        seoDescription: p.short,
        // Démonstration : les photos sont des visuels d'illustration, le badge « Exemple » reste affiché.
        isDemo: true,
      })
      .returning();
    productIds.set(p.slug, row.id);

    const images: (typeof schema.productImages.$inferInsert)[] = [];
    let pos = 0;
    const photo = productPhotos[p.slug];
    // Photo d'illustration (Unsplash) quand elle existe, sinon les visuels générés.
    if (photo) {
      images.push({
        productId: row.id,
        url: photoUrl(photo),
        alt: `${p.name} (visuel d'illustration : ${photo.subject}, photo ${photo.author} / Unsplash)`,
        kind: "gallery",
        color: p.colors[0].name,
        position: pos++,
      });
      // Deux gros plans recadrés dans la même photo (images secondaires du mode immersif).
      for (const k of [1, 2])
        images.push({
          productId: row.id,
          url: `/demo/photos/details/${p.slug}-${k}.jpg`,
          alt: `${p.name}, détail ${k} (visuel d'illustration)`,
          kind: "gallery",
          color: p.colors[0].name,
          position: pos++,
        });
    } else for (const [ci, c] of p.colors.entries()) {
      const base = `/demo/products/${p.slug}/${colorSlug(c.name)}`;
      images.push({ productId: row.id, url: `${base}-editorial.svg`, alt: `${p.name}, coloris ${c.name}, porté sur mannequin (visuel de démonstration)`, kind: "gallery", color: c.name, position: pos++ });
      if (ci === 0)
        images.push({ productId: row.id, url: `${base}-detail.svg`, alt: `Détail de la matière de ${p.name} (visuel de démonstration)`, kind: "gallery", color: c.name, position: pos++ });
      images.push({ productId: row.id, url: `${base}-cutout.svg`, alt: `${p.name}, coloris ${c.name}, détouré`, kind: "cutout", color: c.name, position: pos++ });
      images.push({ productId: row.id, url: `${base}-worn.svg`, alt: `Mannequin portant ${p.name}, coloris ${c.name}`, kind: "worn", color: c.name, position: pos++ });
    }
    await db.insert(schema.productImages).values(images);

    const variants: (typeof schema.productVariants.$inferInsert)[] = [];
    let vpos = 0;
    for (const c of p.colors)
      for (const s of p.sizes) {
        const r = rand();
        variants.push({
          productId: row.id,
          sku: `AU-${p.slug.toUpperCase().replace(/-/g, "").slice(0, 8)}-${colorSlug(c.name).toUpperCase().replace(/-/g, "").slice(0, 6)}-${sizeCode(s)}`,
          size: s,
          color: c.name,
          colorHex: c.hex,
          stock: r < 0.08 ? 0 : r < 0.2 ? 2 : Math.floor(4 + rand() * 12),
          trackInventory: !p.preorder,
          position: vpos++,
        });
      }
    const inserted = await db.insert(schema.productVariants).values(variants).returning();
    variantsBySlug.set(
      p.slug,
      inserted.map((v) => ({ id: v.id, size: v.size, color: v.color, sku: v.sku, price: v.priceCents ?? p.priceCents })),
    );
    const tracked = inserted.filter((v) => v.trackInventory && v.stock > 0);
    if (tracked.length)
      await db
        .insert(schema.inventoryMovements)
        .values(tracked.map((v) => ({ variantId: v.id, delta: v.stock, stockAfter: v.stock, reason: "initial" as const, note: "Stock de démonstration" })));
  }

  // Collections
  const collectionIds = new Map<string, string>();
  for (const [i, c] of collections.entries()) {
    const [row] = await db
      .insert(schema.collections)
      .values({
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        coverImageUrl: pagePhotos[c.slug] ? photoUrl(pagePhotos[c.slug]) : `/demo/collections/${c.slug}.svg`,
        accentColor: c.accent,
        status: "published",
        immersiveEnabled: c.displayMode === "immersive",
        displayMode: c.displayMode,
        position: i,
        isDemo: false,
      })
      .returning();
    collectionIds.set(c.slug, row.id);
    await db
      .insert(schema.collectionProducts)
      .values(c.products.map((slug, position) => ({ collectionId: row.id, productId: productIds.get(slug)!, position })));
  }

  // Page d'accueil
  const featuredIds = products.filter((p) => p.featured).map((p) => productIds.get(p.slug)!);
  const sections: { type: (typeof schema.homepageSectionType.enumValues)[number]; content: HomepageSectionContent }[] = [
    {
      type: "hero",
      content: {
        enabled: true,
        position: 0,
        title: "Avant d'être une marque, nous sommes un atelier.",
        subtitle: "Des pièces nées de la matière et du geste, fabriquées à la commande.",
        imageUrl: photoUrl(pagePhotos.hero),
        ctaLabel: "Explorer les collections",
        ctaHref: "/collections",
      },
    },
    {
      type: "promo_banner",
      content: {
        enabled: true,
        position: 1,
        title: "Livraison offerte dès 150 € · Précommandes ouvertes du 1er au 25 du mois (exemple)",
        ctaHref: "/livraison-retours",
      },
    },
    {
      type: "featured_collection",
      content: {
        enabled: true,
        position: 2,
        title: "Phir",
        subtitle: "La collection à la une",
        body: "Des nouveaux départs et des pièces polyvalentes, en coton tissé artisanalement. Faites tourner les pièces autour de la silhouette et choisissez la vôtre.",
        collectionId: collectionIds.get("phir"),
        ctaLabel: "Entrer dans la collection",
      },
    },
    {
      type: "featured_products",
      content: { enabled: true, position: 3, title: "Pièces à la une", subtitle: "Choisies à l'atelier", productIds: featuredIds },
    },
    {
      type: "story",
      content: {
        enabled: true,
        position: 4,
        title: "L'histoire d'un vêtement",
        subtitle: "De la fibre à la pièce que vous portez",
        body: "Chaque pièce commence par un coton tissé artisanalement, choisi au toucher. Elle est coupée, cousue point par point, puis fabriquée à la commande : rien n'est produit pour dormir dans un stock.",
      },
    },
    { type: "collections", content: { enabled: true, position: 5, title: "Les collections", subtitle: "Trois vestiaires" } },
    { type: "selection", content: { enabled: true, position: 6, title: "La sélection Aune", subtitle: "Nouveautés", mode: "new" } },
    {
      type: "newsletter",
      content: {
        enabled: true,
        position: 7,
        title: "Les lettres de l'atelier",
        subtitle: "Une lettre par mois : nouvelles pièces, coulisses, ouverture des précommandes.",
      },
    },
  ];
  await db.insert(schema.homepageSections).values(sections.map((s) => ({ type: s.type, published: s.content, draft: s.content })));

  // Réductions d'exemple
  await db.insert(schema.discounts).values([
    { code: "BIENVENUE10", description: "Exemple : 10 % sur la première commande", type: "percent", value: 10 },
    { code: "ATELIER20", description: "Exemple : 20 € dès 120 € d'achat", type: "fixed", value: 2000, minSubtotalCents: 12000 },
    { code: "LIVRAISON", description: "Exemple : livraison offerte", type: "free_shipping", value: 0 },
  ]);

  // Comptes de démonstration (clients uniquement, jamais d'administrateur)
  const demoPassword = process.env.DEMO_PASSWORD ?? randomBytes(9).toString("base64url");
  const passwordHash = await hash(demoPassword, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });
  const [customer] = await db
    .insert(schema.users)
    .values({ email: "cliente@exemple.test", passwordHash, firstName: "Camille", lastName: "Exemple" })
    .returning();
  await db.insert(schema.customerProfiles).values({ userId: customer.id });
  const address = {
    firstName: "Camille",
    lastName: "Exemple",
    line1: "1 rue de l'Exemple",
    postalCode: "75000",
    city: "Paris",
    country: "FR",
    phone: null,
  };
  await db.insert(schema.addresses).values({ userId: customer.id, ...address, isDefault: true });

  // Commandes de TEST (is_test = true)
  const orderSpecs = [
    { daysAgo: 21, status: "delivered" as const, items: [["robe-lea", 0, 2], ["paul", 0, 1]] },
    { daysAgo: 12, status: "shipped" as const, items: [["veste-nico", 0, 2], ["jessica", 0, 1]] },
    { daysAgo: 5, status: "paid" as const, items: [["odette-noir", 0, 2], ["yash-estival", 0, 1]] },
    { daysAgo: 1, status: "pending_payment" as const, items: [["robe-camille", 0, 2]] },
  ];
  for (const spec of orderSpecs) {
    const lines = spec.items.map(([slug, colorIndex, sizeIndex]) => {
      const p = products.find((x) => x.slug === slug)!;
      const color = p.colors[colorIndex as number];
      const size = p.sizes[Math.min(sizeIndex as number, p.sizes.length - 1)];
      const v = variantsBySlug.get(slug as string)!.find((x) => x.color === color.name && x.size === size)!;
      return { p, v, color, size, qty: 1 };
    });
    const subtotal = lines.reduce((s, l) => s + l.v.price * l.qty, 0);
    const shipping = subtotal >= 15000 ? 0 : 590;
    const total = subtotal + shipping;
    const createdAt = new Date(Date.now() - spec.daysAgo * 86400_000);
    const paid = spec.status !== "pending_payment";
    const [order] = await db
      .insert(schema.orders)
      .values({
        userId: customer.id,
        email: customer.email,
        status: spec.status,
        paymentStatus: paid ? "paid" : "pending",
        paymentMode: "demo",
        subtotalCents: subtotal,
        shippingCents: shipping,
        taxCents: Math.round((total * 20) / 120),
        totalCents: total,
        shippingAddress: address,
        isTest: true,
        paidAt: paid ? createdAt : null,
        createdAt,
      })
      .returning();
    await db.insert(schema.orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        productId: productIds.get(l.p.slug),
        variantId: l.v.id,
        productName: l.p.name,
        productSlug: l.p.slug,
        variantLabel: `${l.color.name} / ${l.size}`,
        sku: l.v.sku,
        size: l.size,
        color: l.color.name,
        imageUrl: productPhotos[l.p.slug]
          ? photoUrl(productPhotos[l.p.slug])
          : `/demo/products/${l.p.slug}/${colorSlug(l.color.name)}-cutout.svg`,
        unitPriceCents: l.v.price,
        quantity: l.qty,
        lineTotalCents: l.v.price * l.qty,
      })),
    );
    await db.insert(schema.payments).values({
      orderId: order.id,
      provider: "demo",
      providerRef: `demo_seed_${order.id}`,
      status: paid ? "paid" : "pending",
      amountCents: total,
      createdAt,
    });
    await db.insert(schema.orderEvents).values({
      orderId: order.id,
      type: "note",
      message: "Commande de test générée par le script de démonstration.",
      createdAt,
    });
    if (spec.status === "shipped" || spec.status === "delivered")
      await db.insert(schema.shipments).values({
        orderId: order.id,
        trackingNumber: "TEST000000FR",
        status: spec.status === "delivered" ? "delivered" : "shipped",
        shippedAt: createdAt,
      });
  }

  console.log(`\nDonnées de démonstration chargées : ${products.length} produits, ${collections.length} collections, ${orderSpecs.length} commandes de test.`);
  console.log(`Compte client de démo : cliente@exemple.test / ${demoPassword}`);
  console.log("Aucun administrateur n'a été créé : utilisez « npm run admin:create -- --email vous@domaine.fr ».\n");
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
