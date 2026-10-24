"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { parsePriceToCents } from "@/lib/money";
import { slugify, slugPattern } from "@/lib/slug";
import { UploadError, deleteImage, saveImage } from "@/lib/storage";
import type { ActionResult } from "@/components/admin/ActionForm";

const uuid = z.string().uuid();

function refreshShop(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/produits/${slug}`);
}

const optionalPrice = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const cents = parsePriceToCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Prix invalide (ex. 89,00)." });
      return z.NEVER;
    }
    return cents;
  });

const productSchema = z
  .object({
    name: z.string().trim().min(2, "Nom trop court.").max(120),
    slug: z.string().trim().max(80).optional(),
    shortDescription: z.string().trim().max(300),
    description: z.string().trim().max(10000),
    categoryId: z.string().optional(),
    status: z.enum(["draft", "active", "archived"]),
    price: optionalPrice,
    compareAt: optionalPrice,
    materials: z.string().trim().max(2000),
    care: z.string().trim().max(2000),
    sizeGuide: z.string().trim().max(4000),
    craftStory: z.string().trim().max(4000),
    shippingNote: z.string().trim().max(1000),
    weightGrams: z.coerce.number().int().min(0).max(50000),
    seoTitle: z.string().trim().max(70),
    seoDescription: z.string().trim().max(170),
  })
  .superRefine((v, ctx) => {
    if (v.price === null) ctx.addIssue({ code: "custom", path: ["price"], message: "Le prix est obligatoire." });
    if (v.price !== null && v.compareAt !== null && v.compareAt <= v.price)
      ctx.addIssue({ code: "custom", path: ["compareAt"], message: "L'ancien prix doit être supérieur au prix actuel (sinon laissez vide)." });
  });

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

async function uniqueSlug(base: string, exceptId?: string) {
  let slug = base || "produit";
  for (let i = 2; ; i++) {
    const clash = await db.query.products.findFirst({
      where: exceptId ? and(eq(schema.products.slug, slug), ne(schema.products.id, exceptId)) : eq(schema.products.slug, slug),
      columns: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${i}`;
  }
}

/** Création ou mise à jour des informations principales d'un produit. */
export async function saveProduct(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("products.manage");
  const id = String(form.get("id") ?? "");
  const existing = id && uuid.safeParse(id).success ? await db.query.products.findFirst({ where: eq(schema.products.id, id) }) : null;
  if (id && !existing) return { error: "Produit introuvable." };

  const raw = Object.fromEntries(form);
  const parsed = productSchema.safeParse({ ...raw, weightGrams: raw.weightGrams || 0 });
  if (!parsed.success) return { error: "Certains champs sont à corriger.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const wantedSlug = v.slug ? slugify(v.slug) : slugify(v.name);
  if (v.slug && !slugPattern.test(wantedSlug)) return { fieldErrors: { slug: "Adresse invalide." }, error: "Adresse invalide." };
  const slug = await uniqueSlug(wantedSlug, existing?.id);
  const categoryId = v.categoryId && uuid.safeParse(v.categoryId).success ? v.categoryId : null;

  const values = {
    name: v.name,
    slug,
    shortDescription: v.shortDescription,
    description: v.description,
    categoryId,
    status: v.status,
    priceCents: v.price!,
    compareAtPriceCents: v.compareAt,
    isFeatured: form.get("isFeatured") === "on",
    isNew: form.get("isNew") === "on",
    isPreorder: form.get("isPreorder") === "on",
    materials: v.materials,
    care: v.care,
    sizeGuide: v.sizeGuide,
    craftStory: v.craftStory,
    shippingNote: v.shippingNote,
    weightGrams: v.weightGrams,
    seoTitle: v.seoTitle || null,
    seoDescription: v.seoDescription || null,
    // Une fiche modifiée par l'équipe reste marquée « exemple » tant que la case n'est pas décochée.
    isDemo: form.get("isDemo") === "on",
  };

  if (existing) {
    await db.update(schema.products).set(values).where(eq(schema.products.id, existing.id));
    await audit({ userId: user.id, action: "product.update", entityType: "product", entityId: existing.id, data: { name: v.name, status: v.status } });
    refreshShop(slug);
    if (existing.slug !== slug) refreshShop(existing.slug);
    return { ok: true, message: "Produit enregistré." };
  }

  const [created] = await db.insert(schema.products).values(values).returning({ id: schema.products.id });
  await audit({ userId: user.id, action: "product.create", entityType: "product", entityId: created.id, data: { name: v.name } });
  refreshShop();
  redirect(`/admin/produits/${created.id}?cree=1`);
}

const variantInput = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1, "SKU requis").max(60),
  size: z.string().trim().min(1).max(30),
  color: z.string().trim().min(1).max(40),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .or(z.literal(""))
    .optional(),
  price: z.string().trim().max(20).optional(),
  stock: z.coerce.number().int().min(0).max(100000),
  trackInventory: z.boolean(),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean(),
});

/**
 * Remplace l'ensemble des variantes d'un produit à partir de l'éditeur.
 * Tout écart de stock est tracé comme mouvement manuel.
 */
export async function saveVariants(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("products.manage");
  const productId = String(form.get("productId"));
  if (!uuid.safeParse(productId).success) return { error: "Produit introuvable." };
  let rows: unknown;
  try {
    rows = JSON.parse(String(form.get("variants") ?? "[]"));
  } catch {
    return { error: "Données de variantes illisibles." };
  }
  const parsed = z.array(variantInput).max(200).safeParse(rows);
  if (!parsed.success) return { error: `Variante invalide : ${parsed.error.issues[0]?.message ?? "vérifiez les champs"}.` };
  const input = parsed.data;

  const combos = new Set<string>();
  const skus = new Set<string>();
  for (const r of input) {
    const combo = `${r.size.toLowerCase()}|${r.color.toLowerCase()}`;
    if (combos.has(combo)) return { error: `La combinaison ${r.size} / ${r.color} apparaît deux fois.` };
    if (skus.has(r.sku.toUpperCase())) return { error: `Le SKU ${r.sku} apparaît deux fois.` };
    combos.add(combo);
    skus.add(r.sku.toUpperCase());
    if (r.price) {
      const cents = parsePriceToCents(r.price);
      if (cents === null) return { error: `Prix invalide pour ${r.sku}.` };
    }
  }

  const product = await db.query.products.findFirst({ where: eq(schema.products.id, productId), with: { variants: true } });
  if (!product) return { error: "Produit introuvable." };

  const clash = await db.query.productVariants.findFirst({
    where: and(inArray(schema.productVariants.sku, [...input.map((r) => r.sku)]), ne(schema.productVariants.productId, productId)),
    columns: { sku: true },
  });
  if (clash) return { error: `Le SKU ${clash.sku} est déjà utilisé par un autre produit.` };

  const keepIds = new Set(input.map((r) => r.id).filter((x): x is string => !!x && uuid.safeParse(x).success));
  const removed = product.variants.filter((v) => !keepIds.has(v.id));

  try {
    await db.transaction(async (tx) => {
      // Libère d'abord SKU et combinaisons des variantes supprimées ou renommées.
      if (removed.length) await tx.delete(schema.productVariants).where(inArray(schema.productVariants.id, removed.map((v) => v.id)));
      for (const v of product.variants.filter((x) => keepIds.has(x.id)))
        await tx.update(schema.productVariants).set({ sku: `__tmp_${v.id}`, size: `__${v.id}`, color: `__${v.id}` }).where(eq(schema.productVariants.id, v.id));

      for (const [position, r] of input.entries()) {
        const values = {
          sku: r.sku.toUpperCase(),
          size: r.size,
          color: r.color,
          colorHex: r.colorHex || null,
          priceCents: r.price ? parsePriceToCents(r.price) : null,
          trackInventory: r.trackInventory,
          lowStockThreshold: r.lowStockThreshold,
          isActive: r.isActive,
          position,
        };
        const before = r.id ? product.variants.find((v) => v.id === r.id) : undefined;
        if (before) {
          await tx.update(schema.productVariants).set({ ...values, stock: r.stock }).where(eq(schema.productVariants.id, before.id));
          if (before.stock !== r.stock)
            await tx.insert(schema.inventoryMovements).values({ variantId: before.id, delta: r.stock - before.stock, stockAfter: r.stock, reason: "manual", userId: user.id, note: "Modification depuis la fiche produit" });
        } else {
          const [created] = await tx.insert(schema.productVariants).values({ ...values, productId, stock: r.stock }).returning({ id: schema.productVariants.id });
          if (r.stock > 0) await tx.insert(schema.inventoryMovements).values({ variantId: created.id, delta: r.stock, stockAfter: r.stock, reason: "initial", userId: user.id });
        }
      }
    });
  } catch (e) {
    console.error("[admin] variantes", e);
    return { error: "Enregistrement impossible : vérifiez que les SKU et combinaisons sont uniques." };
  }

  await audit({ userId: user.id, action: "product.variants", entityType: "product", entityId: productId, data: { count: input.length, removed: removed.length } });
  revalidatePath(`/admin/produits/${productId}`);
  refreshShop(product.slug);
  return { ok: true, message: `${input.length} variante(s) enregistrée(s).` };
}

const imageKinds = ["gallery", "cutout", "worn"] as const;

export async function uploadProductImages(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("products.manage");
  const productId = String(form.get("productId"));
  const product = uuid.safeParse(productId).success ? await db.query.products.findFirst({ where: eq(schema.products.id, productId), columns: { id: true, slug: true, name: true } }) : null;
  if (!product) return { error: "Produit introuvable." };
  const kind = z.enum(imageKinds).catch("gallery").parse(form.get("kind"));
  const color = String(form.get("color") ?? "").trim().slice(0, 40) || null;
  const alt = String(form.get("alt") ?? "").trim().slice(0, 200);
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choisissez au moins une image." };
  if (files.length > 12) return { error: "12 images maximum par envoi." };

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${schema.productImages.position}), -1)::int` })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, productId));
  const saved: string[] = [];
  try {
    for (const file of files) saved.push(await saveImage(file, "products"));
  } catch (e) {
    await Promise.all(saved.map(deleteImage));
    return { error: e instanceof UploadError ? e.message : "Téléversement impossible." };
  }
  await db.insert(schema.productImages).values(
    saved.map((url, i) => ({ productId, url, kind, color, alt: alt || `${product.name}${color ? ` — ${color}` : ""}`, position: max + 1 + i })),
  );
  await audit({ userId: user.id, action: "product.images.upload", entityType: "product", entityId: productId, data: { count: saved.length, kind } });
  revalidatePath(`/admin/produits/${productId}`);
  refreshShop(product.slug);
  return { ok: true, message: `${saved.length} image(s) ajoutée(s).` };
}

export async function updateProductImage(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("products.manage");
  const id = String(form.get("imageId"));
  if (!uuid.safeParse(id).success) return { error: "Image introuvable." };
  const image = await db.query.productImages.findFirst({ where: eq(schema.productImages.id, id), with: { product: { columns: { slug: true } } } });
  if (!image) return { error: "Image introuvable." };
  const op = String(form.get("op") ?? "save");

  if (op === "delete") {
    await db.delete(schema.productImages).where(eq(schema.productImages.id, id));
    await deleteImage(image.url);
    await audit({ userId: user.id, action: "product.images.delete", entityType: "product", entityId: image.productId });
  } else if (op === "up" || op === "down") {
    const all = await db.query.productImages.findMany({ where: eq(schema.productImages.productId, image.productId), orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)] });
    const i = all.findIndex((x) => x.id === id);
    const j = op === "up" ? i - 1 : i + 1;
    if (j >= 0 && j < all.length) [all[i], all[j]] = [all[j], all[i]];
    await db.transaction(async (tx) => {
      for (const [position, img] of all.entries()) await tx.update(schema.productImages).set({ position }).where(eq(schema.productImages.id, img.id));
    });
  } else {
    await db
      .update(schema.productImages)
      .set({
        alt: String(form.get("alt") ?? "").trim().slice(0, 200),
        kind: z.enum(imageKinds).catch(image.kind).parse(form.get("kind")),
        color: String(form.get("color") ?? "").trim().slice(0, 40) || null,
      })
      .where(eq(schema.productImages.id, id));
  }
  revalidatePath(`/admin/produits/${image.productId}`);
  refreshShop(image.product.slug);
  return { ok: true, message: op === "delete" ? "Image supprimée." : "Image mise à jour." };
}

export async function setProductCollections(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("collections.manage");
  const productId = String(form.get("productId"));
  if (!uuid.safeParse(productId).success) return { error: "Produit introuvable." };
  const wanted = form.getAll("collectionIds").map(String).filter((x) => uuid.safeParse(x).success);
  await db.transaction(async (tx) => {
    const current = await tx.query.collectionProducts.findMany({ where: eq(schema.collectionProducts.productId, productId) });
    const toRemove = current.filter((c) => !wanted.includes(c.collectionId)).map((c) => c.collectionId);
    if (toRemove.length)
      await tx.delete(schema.collectionProducts).where(and(eq(schema.collectionProducts.productId, productId), inArray(schema.collectionProducts.collectionId, toRemove)));
    for (const collectionId of wanted.filter((w) => !current.some((c) => c.collectionId === w))) {
      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${schema.collectionProducts.position}), -1)::int` })
        .from(schema.collectionProducts)
        .where(eq(schema.collectionProducts.collectionId, collectionId));
      await tx.insert(schema.collectionProducts).values({ collectionId, productId, position: max + 1 });
    }
  });
  await audit({ userId: user.id, action: "product.collections", entityType: "product", entityId: productId, data: { collections: wanted } });
  revalidatePath(`/admin/produits/${productId}`);
  refreshShop();
  return { ok: true, message: "Collections mises à jour." };
}

export async function duplicateProduct(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("products.manage");
  const id = String(form.get("id"));
  const p = uuid.safeParse(id).success ? await db.query.products.findFirst({ where: eq(schema.products.id, id), with: { variants: true, images: true } }) : null;
  if (!p) return { error: "Produit introuvable." };
  const slug = await uniqueSlug(`${p.slug}-copie`);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const newId = await db.transaction(async (tx) => {
    const { id: _id, createdAt: _c, updatedAt: _u, variants, images, ...rest } = p;
    const [created] = await tx.insert(schema.products).values({ ...rest, slug, name: `${p.name} (copie)`, status: "draft", isFeatured: false }).returning({ id: schema.products.id });
    if (variants.length)
      await tx.insert(schema.productVariants).values(
        variants.map(({ id: _v, createdAt: _vc, updatedAt: _vu, ...v }) => ({ ...v, productId: created.id, sku: `${v.sku}-${suffix}`.slice(0, 60), stock: 0 })),
      );
    // Les images sont partagées (même URL) : on ne supprime le fichier qu'à la suppression de la dernière référence.
    if (images.length) await tx.insert(schema.productImages).values(images.map(({ id: _i, createdAt: _ic, ...img }) => ({ ...img, productId: created.id })));
    return created.id;
  });
  await audit({ userId: user.id, action: "product.duplicate", entityType: "product", entityId: newId, data: { from: p.id } });
  redirect(`/admin/produits/${newId}?copie=1`);
}

/** Actions groupées depuis la liste des produits. */
export async function bulkProducts(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("products.manage");
  const ids = form.getAll("ids").map(String).filter((x) => uuid.safeParse(x).success);
  const op = String(form.get("op"));
  if (!ids.length) return { error: "Sélectionnez au moins un produit." };
  const where = inArray(schema.products.id, ids);

  switch (op) {
    case "active":
    case "draft":
    case "archived":
      await db.update(schema.products).set({ status: op }).where(where);
      break;
    case "feature":
    case "unfeature":
      await db.update(schema.products).set({ isFeatured: op === "feature" }).where(where);
      break;
    case "new":
    case "unnew":
      await db.update(schema.products).set({ isNew: op === "new" }).where(where);
      break;
    case "price": {
      const pct = Number(String(form.get("percent") ?? "").replace(",", "."));
      if (!Number.isFinite(pct) || pct === 0 || pct < -90 || pct > 300) return { error: "Indiquez une variation entre −90 % et +300 %." };
      // Arrondi au centime ; l'ancien prix barré est retiré s'il devient incohérent.
      await db
        .update(schema.products)
        .set({
          priceCents: sql`round(${schema.products.priceCents} * ${1 + pct / 100})::int`,
          compareAtPriceCents: sql`case when ${schema.products.compareAtPriceCents} > round(${schema.products.priceCents} * ${1 + pct / 100}) then ${schema.products.compareAtPriceCents} else null end`,
        })
        .where(where);
      break;
    }
    case "delete": {
      const ordered = await db
        .selectDistinct({ productId: schema.orderItems.productId })
        .from(schema.orderItems)
        .where(inArray(schema.orderItems.productId, ids));
      if (ordered.length) return { error: `${ordered.length} produit(s) ont déjà été commandés : archivez-les plutôt que de les supprimer.` };
      const images = await db.query.productImages.findMany({ where: inArray(schema.productImages.productId, ids), columns: { url: true } });
      await db.delete(schema.products).where(where);
      for (const { url } of images) {
        const stillUsed = await db.query.productImages.findFirst({ where: eq(schema.productImages.url, url), columns: { id: true } });
        if (!stillUsed) await deleteImage(url);
      }
      break;
    }
    default:
      return { error: "Action inconnue." };
  }
  await audit({ userId: user.id, action: `product.bulk.${op}`, entityType: "product", data: { ids } });
  revalidatePath("/admin/produits");
  refreshShop();
  return { ok: true, message: `${ids.length} produit(s) mis à jour.` };
}

export async function saveCategory(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("products.manage");
  const parsed = z
    .object({ id: z.string().optional(), name: z.string().trim().min(2).max(60), department: z.enum(["femme", "homme", "mixte"]), position: z.coerce.number().int().min(0).max(999) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Vérifiez le nom et le rayon." };
  const { id, ...v } = parsed.data;
  if (id && uuid.safeParse(id).success) {
    if (form.get("op") === "delete") {
      await db.delete(schema.categories).where(eq(schema.categories.id, id));
      await audit({ userId: user.id, action: "category.delete", entityType: "category", entityId: id });
      refreshShop();
      revalidatePath("/admin/produits/categories");
      return { ok: true, message: "Catégorie supprimée (les produits restent, sans catégorie)." };
    }
    await db.update(schema.categories).set(v).where(eq(schema.categories.id, id));
  } else {
    const base = slugify(v.name);
    let slug = base;
    for (let i = 2; await db.query.categories.findFirst({ where: eq(schema.categories.slug, slug) }); i++) slug = `${base}-${i}`;
    await db.insert(schema.categories).values({ ...v, slug });
  }
  await audit({ userId: user.id, action: "category.save", entityType: "category", entityId: id || null, data: v });
  refreshShop();
  revalidatePath("/admin/produits/categories");
  return { ok: true, message: "Catégorie enregistrée." };
}
