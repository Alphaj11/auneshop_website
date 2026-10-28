import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * Conventions
 * - Tous les montants sont des entiers en centimes d'euro (jamais de flottants).
 * - Les commandes copient les informations commerciales au moment de l'achat :
 *   modifier le catalogue ne modifie jamais une commande passée.
 * - `is_demo` / `is_test` isolent les données de démonstration.
 */

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------
// Utilisateurs, rôles et sessions
// ---------------------------------------------------------------------------

/** Rôles. Les permissions associées sont définies dans src/lib/auth/permissions.ts */
export const userRole = pgEnum("user_role", [
  "customer",
  "order_manager",
  "store_manager",
  "super_admin",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("customer"),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    /** Compte anonymisé suite à une demande de suppression (RGPD). */
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(sql`lower(${t.email})`),
    index("users_role_idx").on(t.role),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 du jeton envoyé dans le cookie : le jeton brut n'est jamais stocké. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("prt_user_idx").on(t.userId)],
);

export const customerProfiles = pgTable("customer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone"),
  acceptsMarketing: boolean("accepts_marketing").notNull().default(false),
  marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Domicile"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    postalCode: text("postal_code").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull().default("FR"),
    phone: text("phone"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);
export const imageKind = pgEnum("image_kind", ["gallery", "cutout", "worn"]);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** "femme", "homme" ou "mixte" : sert au menu de navigation. */
    department: text("department").notNull().default("mixte"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("categories_slug_unique").on(t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    status: productStatus("status").notNull().default("draft"),
    /** Prix TTC de base en centimes. Une variante peut le surcharger. */
    priceCents: integer("price_cents").notNull(),
    /** Ancien prix barré (doit être supérieur au prix). */
    compareAtPriceCents: integer("compare_at_price_cents"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    materials: text("materials").notNull().default(""),
    care: text("care").notNull().default(""),
    sizeGuide: text("size_guide").notNull().default(""),
    /** Texte sur la fabrication, uniquement s'il est connu et vérifié. */
    craftStory: text("craft_story").notNull().default(""),
    weightGrams: integer("weight_grams").notNull().default(0),
    shippingNote: text("shipping_note").notNull().default(""),
    /** Produit fabriqué à la commande (précommande). */
    isPreorder: boolean("is_preorder").notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    /** Donnée de démonstration à remplacer. */
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("products_slug_unique").on(t.slug),
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.categoryId),
    check("products_price_positive", sql`${t.priceCents} >= 0`),
    check(
      "products_compare_at_gt_price",
      sql`${t.compareAtPriceCents} IS NULL OR ${t.compareAtPriceCents} > ${t.priceCents}`,
    ),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    /**
     * gallery : photo de la fiche produit
     * cutout  : vêtement détouré (scène orbitale)
     * worn    : visuel du mannequin portant le vêtement (scène orbitale)
     */
    kind: imageKind("kind").notNull().default("gallery"),
    /** Couleur de variante associée, pour changer le visuel selon la couleur. */
    color: text("color"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.position)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    size: text("size").notNull().default("Unique"),
    color: text("color").notNull().default("Unique"),
    colorHex: text("color_hex"),
    /** Surcharge du prix produit, sinon null. */
    priceCents: integer("price_cents"),
    stock: integer("stock").notNull().default(0),
    /** Si false, le stock n'est pas décompté (fabrication à la demande). */
    trackInventory: boolean("track_inventory").notNull().default(true),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("variants_sku_unique").on(t.sku),
    uniqueIndex("variants_product_size_color_unique").on(t.productId, t.size, t.color),
    index("variants_product_idx").on(t.productId),
    check("variants_stock_non_negative", sql`${t.stock} >= 0`),
    check("variants_price_positive", sql`${t.priceCents} IS NULL OR ${t.priceCents} >= 0`),
  ],
);

export const collectionStatus = pgEnum("collection_status", ["draft", "published"]);
export const collectionDisplay = pgEnum("collection_display", ["immersive", "grid"]);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull().default(""),
    description: text("description").notNull().default(""),
    coverImageUrl: text("cover_image_url"),
    /** Couleur d'ambiance de la scène immersive. */
    accentColor: text("accent_color").notNull().default("#B5562F"),
    status: collectionStatus("status").notNull().default("draft"),
    immersiveEnabled: boolean("immersive_enabled").notNull().default(true),
    displayMode: collectionDisplay("display_mode").notNull().default("immersive"),
    position: integer("position").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("collections_slug_unique").on(t.slug), index("collections_status_idx").on(t.status)],
);

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.productId] }),
    index("collection_products_product_idx").on(t.productId),
  ],
);

export const inventoryReason = pgEnum("inventory_reason", [
  "initial",
  "order",
  "order_cancelled",
  "manual",
  "return",
  "restock",
]);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    stockAfter: integer("stock_after").notNull(),
    reason: inventoryReason("reason").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("inventory_variant_idx").on(t.variantId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Panier et réductions
// ---------------------------------------------------------------------------

export const discountType = pgEnum("discount_type", ["percent", "fixed", "free_shipping"]);

export const discounts = pgTable(
  "discounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    description: text("description").notNull().default(""),
    type: discountType("type").notNull(),
    /** percent : pourcentage entier (10 = 10 %) ; fixed : centimes ; free_shipping : 0. */
    value: integer("value").notNull().default(0),
    minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("discounts_code_unique").on(sql`upper(${t.code})`),
    check("discounts_value_valid", sql`${t.value} >= 0 AND (${t.type} <> 'percent' OR ${t.value} <= 100)`),
  ],
);

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    discountCode: text("discount_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("carts_user_idx").on(t.userId)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("cart_items_cart_variant_unique").on(t.cartId, t.variantId),
    check("cart_items_quantity_positive", sql`${t.quantity} > 0 AND ${t.quantity} <= 20`),
  ],
);

// ---------------------------------------------------------------------------
// Commandes, paiements, expéditions
// ---------------------------------------------------------------------------

export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
]);
export const paymentMode = pgEnum("payment_mode", ["demo", "stripe_test", "stripe_live"]);

export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 100001 });

export type AddressSnapshot = {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string | null;
  postalCode: string;
  city: string;
  country: string;
  phone?: string | null;
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Numéro lisible (ex. AU-100042), généré par une séquence. */
    number: text("number")
      .notNull()
      .default(sql`'AU-' || nextval('order_number_seq')::text`),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    status: orderStatus("status").notNull().default("pending_payment"),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    paymentMode: paymentMode("payment_mode").notNull(),
    currency: text("currency").notNull().default("EUR"),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    shippingCents: integer("shipping_cents").notNull().default(0),
    /** TVA incluse dans le total (prix TTC). */
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    discountCode: text("discount_code"),
    shippingMethod: text("shipping_method").notNull().default("Colissimo"),
    shippingAddress: jsonb("shipping_address").$type<AddressSnapshot>().notNull(),
    billingAddress: jsonb("billing_address").$type<AddressSnapshot>(),
    customerNote: text("customer_note"),
    /** Commande de test ou de démonstration : jamais expédiée ni remboursée réellement. */
    isTest: boolean("is_test").notNull().default(false),
    /** Panier d'origine, vidé une fois le paiement confirmé. */
    cartId: uuid("cart_id"),
    /** Le stock a été réservé pour cette commande (à restituer en cas d'annulation). */
    stockReserved: boolean("stock_reserved").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_number_unique").on(t.number),
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_email_idx").on(sql`lower(${t.email})`),
    check(
      "orders_amounts_valid",
      sql`${t.subtotalCents} >= 0 AND ${t.discountCents} >= 0 AND ${t.shippingCents} >= 0 AND ${t.totalCents} >= 0`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    // Copie figée au moment de l'achat
    productName: text("product_name").notNull(),
    productSlug: text("product_slug"),
    variantLabel: text("variant_label").notNull(),
    sku: text("sku").notNull(),
    size: text("size"),
    color: text("color"),
    imageUrl: text("image_url"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_product_idx").on(t.productId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** status_change, payment, note, shipment, email, inquiry… */
    type: text("type").notNull(),
    message: text("message").notNull(),
    /** Note interne invisible du client. */
    isInternal: boolean("is_internal").notNull().default(true),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    data: jsonb("data"),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // "stripe" | "demo"
    /** Identifiant de session Checkout (Stripe) ou de paiement démo. */
    providerRef: text("provider_ref").notNull(),
    paymentIntentId: text("payment_intent_id"),
    status: paymentStatus("status").notNull().default("pending"),
    amountCents: integer("amount_cents").notNull(),
    refundedCents: integer("refunded_cents").notNull().default(0),
    currency: text("currency").notNull().default("EUR"),
    livemode: boolean("livemode").notNull().default(false),
    failureMessage: text("failure_message"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payments_provider_ref_unique").on(t.provider, t.providerRef),
    index("payments_order_idx").on(t.orderId),
  ],
);

/** Événements webhook déjà traités (idempotence). */
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shipmentStatus = pgEnum("shipment_status", ["preparing", "shipped", "delivered", "returned"]);

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    carrier: text("carrier").notNull().default("Colissimo"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    status: shipmentStatus("status").notNull().default("preparing"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("shipments_order_idx").on(t.orderId)],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [index("inquiries_created_idx").on(t.createdAt)],
);

// ---------------------------------------------------------------------------
// Favoris, contenu, newsletter, réglages, audit
// ---------------------------------------------------------------------------

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

/** Une seule ligne (id = 1). Le contenu est validé par src/lib/settings-schema.ts */
export const storeSettings = pgTable(
  "store_settings",
  {
    id: integer("id").primaryKey().default(1),
    data: jsonb("data").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [check("store_settings_singleton", sql`${t.id} = 1`)],
);

export const homepageSectionType = pgEnum("homepage_section_type", [
  "hero",
  "promo_banner",
  "featured_collection",
  "featured_products",
  "story",
  "collections",
  "selection",
  "newsletter",
]);

export type HomepageSectionContent = {
  enabled: boolean;
  position: number;
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  collectionId?: string | null;
  productIds?: string[];
  /** selection : "new" | "featured" | "popular" | "manual" */
  mode?: string;
};

export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: homepageSectionType("type").notNull(),
    /** Version publiée, visible du public. */
    published: jsonb("published").$type<HomepageSectionContent>().notNull(),
    /** Brouillon en cours d'édition, visible uniquement en prévisualisation. */
    draft: jsonb("draft").$type<HomepageSectionContent>().notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("homepage_sections_type_unique").on(t.type)],
);

export const newsletterStatus = pgEnum("newsletter_status", ["subscribed", "unsubscribed"]);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    status: newsletterStatus("status").notNull().default("subscribed"),
    consentText: text("consent_text").notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull().default("site"),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("newsletter_email_unique").on(sql`lower(${t.email})`),
    uniqueIndex("newsletter_token_unique").on(t.unsubscribeToken),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_entity_idx").on(t.entityType, t.entityId)],
);

/** Limitation des tentatives (connexion, inscription, newsletter…). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(customerProfiles, { fields: [users.id], references: [customerProfiles.userId] }),
  addresses: many(addresses),
  orders: many(orders),
  wishlist: many(wishlistItems),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  variants: many(productVariants),
  collections: many(collectionProducts),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(collectionProducts),
}));

export const collectionProductsRelations = relations(collectionProducts, ({ one }) => ({
  collection: one(collections, { fields: [collectionProducts.collectionId], references: [collections.id] }),
  product: one(products, { fields: [collectionProducts.productId], references: [products.id] }),
}));

export const cartsRelations = relations(carts, ({ many }) => ({
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
  shipments: many(shipments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
  user: one(users, { fields: [orderEvents.userId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  variant: one(productVariants, { fields: [inventoryMovements.variantId], references: [productVariants.id] }),
}));

// ---------------------------------------------------------------------------
// Qamar : demandes de l'équipe de la boutique aux concepteurs du site
// ---------------------------------------------------------------------------

export const designerRequestType = pgEnum("designer_request_type", ["demande", "amelioration", "probleme"]);
export const designerRequestPriority = pgEnum("designer_request_priority", ["basse", "normale", "haute", "urgente"]);
export const designerRequestStatus = pgEnum("designer_request_status", ["nouveau", "en_cours", "resolu"]);

export const designerRequests = pgTable(
  "designer_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: designerRequestType("type").notNull(),
    priority: designerRequestPriority("priority").notNull().default("normale"),
    status: designerRequestStatus("status").notNull().default("nouveau"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    /** Page du site concernée (facultatif). */
    pageUrl: text("page_url"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("designer_requests_created_idx").on(t.createdAt), index("designer_requests_status_idx").on(t.status)],
);

export const designerRequestAttachments = pgTable("designer_request_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => designerRequests.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  createdAt: createdAt(),
});

/** Fil d'échanges sur une demande (équipe de la boutique et concepteurs). */
export const designerRequestMessages = pgTable("designer_request_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => designerRequests.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  createdAt: createdAt(),
});

export const designerRequestsRelations = relations(designerRequests, ({ many, one }) => ({
  attachments: many(designerRequestAttachments),
  messages: many(designerRequestMessages),
  author: one(users, { fields: [designerRequests.userId], references: [users.id] }),
}));
export const designerRequestAttachmentsRelations = relations(designerRequestAttachments, ({ one }) => ({
  request: one(designerRequests, { fields: [designerRequestAttachments.requestId], references: [designerRequests.id] }),
}));
export const designerRequestMessagesRelations = relations(designerRequestMessages, ({ one }) => ({
  request: one(designerRequests, { fields: [designerRequestMessages.requestId], references: [designerRequests.id] }),
  author: one(users, { fields: [designerRequestMessages.userId], references: [users.id] }),
}));
