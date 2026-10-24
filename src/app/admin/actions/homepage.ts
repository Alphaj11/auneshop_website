"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { HomepageSectionContent } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { UploadError, saveImage } from "@/lib/storage";
import type { ActionResult } from "@/components/admin/ActionForm";

/** Liens autorisés : chemin interne ou https. Refuse javascript:, data:, etc. */
const safeHref = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\/[^\s]+$/.test(v), "Lien invalide : commencez par / ou https://");

const sectionSchema = z.object({
  title: z.string().trim().max(200),
  subtitle: z.string().trim().max(400),
  body: z.string().trim().max(3000),
  ctaLabel: z.string().trim().max(60),
  ctaHref: safeHref,
  position: z.coerce.number().int().min(0).max(99),
  mode: z.enum(["new", "featured", "popular", "manual"]).optional(),
  collectionId: z.string().uuid().or(z.literal("")).optional(),
});

/** Enregistre le brouillon d'une section. Le public ne voit rien tant que ce n'est pas publié. */
export async function saveSectionDraft(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("content.manage");
  const id = String(form.get("id"));
  const section = z.string().uuid().safeParse(id).success ? await db.query.homepageSections.findFirst({ where: eq(schema.homepageSections.id, id) }) : null;
  if (!section) return { error: "Section introuvable." };
  const raw = Object.fromEntries(form);
  const parsed = sectionSchema.safeParse({ title: "", subtitle: "", body: "", ctaLabel: "", ctaHref: "", position: section.draft.position, ...raw });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };

  let imageUrl = section.draft.imageUrl;
  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "homepage");
    } catch (e) {
      return { error: e instanceof UploadError ? e.message : "Téléversement impossible." };
    }
  }
  const productIds = form.getAll("productIds").map(String).filter((x) => z.string().uuid().safeParse(x).success).slice(0, 12);
  const { collectionId, mode, ...v } = parsed.data;
  const draft: HomepageSectionContent = {
    ...section.draft,
    ...v,
    enabled: form.get("enabled") === "on",
    imageUrl,
    ...(form.has("collectionId") ? { collectionId: collectionId || null } : {}),
    ...(form.has("mode") ? { mode } : {}),
    ...(form.has("productIdsPresent") ? { productIds } : {}),
  };
  await db.update(schema.homepageSections).set({ draft }).where(eq(schema.homepageSections.id, id));
  await audit({ userId: user.id, action: "homepage.draft", entityType: "homepage_section", entityId: id, data: { type: section.type } });
  revalidatePath("/admin/accueil");
  return { ok: true, message: "Brouillon enregistré. Vérifiez l'aperçu puis publiez." };
}

export async function publishHomepage(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("content.manage");
  const op = String(form.get("op"));
  if (op === "discard") {
    await db.update(schema.homepageSections).set({ draft: sql`${schema.homepageSections.published}` });
    await audit({ userId: user.id, action: "homepage.discard", entityType: "homepage_section" });
    revalidatePath("/admin/accueil");
    return { ok: true, message: "Brouillon annulé : retour à la version en ligne." };
  }
  await db.update(schema.homepageSections).set({ published: sql`${schema.homepageSections.draft}` });
  await audit({ userId: user.id, action: "homepage.publish", entityType: "homepage_section" });
  revalidatePath("/", "layout");
  return { ok: true, message: "Page d'accueil publiée." };
}
