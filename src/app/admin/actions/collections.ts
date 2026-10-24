"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { slugify } from "@/lib/slug";
import { UploadError, deleteImage, saveImage } from "@/lib/storage";
import type { ActionResult } from "@/components/admin/ActionForm";

const uuid = z.string().uuid();

const collectionSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court.").max(80),
  slug: z.string().trim().max(80).optional(),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(4000),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide."),
  status: z.enum(["draft", "published"]),
  displayMode: z.enum(["immersive", "grid"]),
  position: z.coerce.number().int().min(0).max(999),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170),
});

async function uniqueSlug(base: string, exceptId?: string) {
  let slug = base || "collection";
  for (let i = 2; ; i++) {
    const clash = await db.query.collections.findFirst({
      where: exceptId ? and(eq(schema.collections.slug, slug), ne(schema.collections.id, exceptId)) : eq(schema.collections.slug, slug),
      columns: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${i}`;
  }
}

function refresh(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/collections/${slug}`);
}

export async function saveCollection(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("collections.manage");
  const id = String(form.get("id") ?? "");
  const existing = id && uuid.safeParse(id).success ? await db.query.collections.findFirst({ where: eq(schema.collections.id, id) }) : null;
  if (id && !existing) return { error: "Collection introuvable." };
  const parsed = collectionSchema.safeParse({ position: 0, ...Object.fromEntries(form) });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Certains champs sont à corriger.", fieldErrors };
  }
  const v = parsed.data;
  const slug = await uniqueSlug(slugify(v.slug || v.name), existing?.id);

  let coverImageUrl = existing?.coverImageUrl ?? null;
  const file = form.get("cover");
  if (file instanceof File && file.size > 0) {
    try {
      coverImageUrl = await saveImage(file, "collections");
    } catch (e) {
      return { error: e instanceof UploadError ? e.message : "Téléversement impossible." };
    }
    if (existing?.coverImageUrl) await deleteImage(existing.coverImageUrl);
  } else if (form.get("removeCover") === "on") {
    if (existing?.coverImageUrl) await deleteImage(existing.coverImageUrl);
    coverImageUrl = null;
  }

  const values = {
    ...v,
    slug,
    coverImageUrl,
    seoTitle: v.seoTitle || null,
    seoDescription: v.seoDescription || null,
    immersiveEnabled: form.get("immersiveEnabled") === "on",
    isDemo: form.get("isDemo") === "on",
  };
  if (existing) {
    await db.update(schema.collections).set(values).where(eq(schema.collections.id, existing.id));
    await audit({ userId: user.id, action: "collection.update", entityType: "collection", entityId: existing.id, data: { name: v.name, status: v.status } });
    refresh(slug);
    if (existing.slug !== slug) refresh(existing.slug);
    return { ok: true, message: "Collection enregistrée." };
  }
  const [created] = await db.insert(schema.collections).values(values).returning({ id: schema.collections.id });
  await audit({ userId: user.id, action: "collection.create", entityType: "collection", entityId: created.id, data: { name: v.name } });
  refresh();
  redirect(`/admin/collections/${created.id}`);
}

/** Enregistre la liste ordonnée des produits d'une collection. */
export async function setCollectionProducts(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("collections.manage");
  const collectionId = String(form.get("collectionId"));
  const collection = uuid.safeParse(collectionId).success ? await db.query.collections.findFirst({ where: eq(schema.collections.id, collectionId) }) : null;
  if (!collection) return { error: "Collection introuvable." };
  const ids = z.array(uuid).max(200).safeParse(JSON.parse(String(form.get("productIds") ?? "[]")));
  if (!ids.success) return { error: "Liste de produits invalide." };
  const unique = [...new Set(ids.data)];
  await db.transaction(async (tx) => {
    await tx.delete(schema.collectionProducts).where(eq(schema.collectionProducts.collectionId, collectionId));
    if (unique.length) await tx.insert(schema.collectionProducts).values(unique.map((productId, position) => ({ collectionId, productId, position })));
  });
  await audit({ userId: user.id, action: "collection.products", entityType: "collection", entityId: collectionId, data: { count: unique.length } });
  revalidatePath(`/admin/collections/${collectionId}`);
  refresh(collection.slug);
  return { ok: true, message: `${unique.length} produit(s) dans la collection.` };
}

/** Met la collection en avant dans la section « Collection à la une » (brouillon et version publiée). */
export async function featureCollectionOnHome(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("content.manage");
  const collectionId = String(form.get("collectionId"));
  const collection = uuid.safeParse(collectionId).success ? await db.query.collections.findFirst({ where: eq(schema.collections.id, collectionId) }) : null;
  if (!collection) return { error: "Collection introuvable." };
  if (collection.status !== "published") return { error: "Publiez d'abord la collection." };
  const updated = await db
    .update(schema.homepageSections)
    .set({
      published: sql`jsonb_set(${schema.homepageSections.published}, '{collectionId}', to_jsonb(${collectionId}::text))`,
      draft: sql`jsonb_set(${schema.homepageSections.draft}, '{collectionId}', to_jsonb(${collectionId}::text))`,
    })
    .where(eq(schema.homepageSections.type, "featured_collection"))
    .returning({ id: schema.homepageSections.id });
  if (!updated.length) return { error: "La section « Collection à la une » n'existe pas. Configurez la page d'accueil." };
  await audit({ userId: user.id, action: "homepage.feature_collection", entityType: "collection", entityId: collectionId });
  refresh();
  return { ok: true, message: `« ${collection.name} » est à la une de l'accueil.` };
}

export async function deleteCollection(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("collections.manage");
  const id = String(form.get("id"));
  const collection = uuid.safeParse(id).success ? await db.query.collections.findFirst({ where: eq(schema.collections.id, id) }) : null;
  if (!collection) return { error: "Collection introuvable." };
  await db.delete(schema.collections).where(eq(schema.collections.id, id));
  if (collection.coverImageUrl) await deleteImage(collection.coverImageUrl);
  await audit({ userId: user.id, action: "collection.delete", entityType: "collection", entityId: id, data: { name: collection.name } });
  refresh(collection.slug);
  redirect("/admin/collections");
}
