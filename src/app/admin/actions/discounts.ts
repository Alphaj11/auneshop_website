"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { parsePriceToCents } from "@/lib/money";
import type { ActionResult } from "@/components/admin/ActionForm";

const schemaIn = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "Code : 3 à 30 lettres, chiffres, - ou _"),
  description: z.string().trim().max(200),
  type: z.enum(["percent", "fixed", "free_shipping"]),
  value: z.string().trim(),
  minSubtotal: z.string().trim(),
  startsAt: z.string().trim(),
  endsAt: z.string().trim(),
  usageLimit: z.string().trim(),
});

export async function saveDiscount(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("products.manage");
  if (form.get("op") === "delete") {
    const id = String(form.get("id"));
    if (!z.string().uuid().safeParse(id).success) return { error: "Introuvable." };
    await db.delete(schema.discounts).where(eq(schema.discounts.id, id));
    await audit({ userId: user.id, action: "discount.delete", entityType: "discount", entityId: id });
    revalidatePath("/admin/reductions");
    return { ok: true, message: "Code supprimé (les commandes passées gardent leur réduction)." };
  }
  const parsed = schemaIn.safeParse({ description: "", value: "", minSubtotal: "", startsAt: "", endsAt: "", usageLimit: "", ...Object.fromEntries(form) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const v = parsed.data;

  let value = 0;
  if (v.type === "percent") {
    value = Number(v.value);
    if (!Number.isInteger(value) || value < 1 || value > 100) return { error: "Pourcentage entre 1 et 100." };
  } else if (v.type === "fixed") {
    const cents = parsePriceToCents(v.value);
    if (!cents || cents <= 0) return { error: "Montant de réduction invalide." };
    value = cents;
  }
  const minSubtotalCents = v.minSubtotal ? parsePriceToCents(v.minSubtotal) : 0;
  if (minSubtotalCents === null) return { error: "Minimum de commande invalide." };
  const usageLimit = v.usageLimit ? Number(v.usageLimit) : null;
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) return { error: "Limite d'utilisation invalide." };
  const startsAt = v.startsAt ? new Date(`${v.startsAt}T00:00:00`) : null;
  const endsAt = v.endsAt ? new Date(`${v.endsAt}T23:59:59`) : null;
  if (startsAt && endsAt && endsAt < startsAt) return { error: "La date de fin précède la date de début." };

  const clash = await db.query.discounts.findFirst({
    where: and(sql`upper(${schema.discounts.code}) = ${v.code}`, v.id ? ne(schema.discounts.id, v.id) : undefined),
    columns: { id: true },
  });
  if (clash) return { error: "Ce code existe déjà." };

  const values = { code: v.code, description: v.description, type: v.type, value, minSubtotalCents, usageLimit, startsAt, endsAt, isActive: form.get("isActive") === "on" };
  if (v.id) await db.update(schema.discounts).set(values).where(eq(schema.discounts.id, v.id));
  else await db.insert(schema.discounts).values(values);
  await audit({ userId: user.id, action: v.id ? "discount.update" : "discount.create", entityType: "discount", entityId: v.id || null, data: values });
  revalidatePath("/admin/reductions");
  return { ok: true, message: "Code enregistré." };
}
