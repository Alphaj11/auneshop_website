"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import type { ActionResult } from "@/components/admin/ActionForm";

/**
 * Ajustement manuel du stock d'une variante, tracé dans l'historique.
 * mode "add" : ajoute (ou retire si négatif) ; mode "set" : fixe la quantité comptée.
 */
export async function adjustStock(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requirePermission("inventory.manage");
  const parsed = z
    .object({
      variantId: z.string().uuid(),
      mode: z.enum(["add", "set"]),
      quantity: z.coerce.number().int().min(-100000).max(100000),
      reason: z.enum(["manual", "restock", "return"]),
      note: z.string().trim().max(300).optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Quantité invalide." };
  const { variantId, mode, quantity, reason, note } = parsed.data;
  if (mode === "add" && quantity === 0) return { error: "Indiquez une quantité différente de zéro." };
  if (mode === "set" && quantity < 0) return { error: "Le stock ne peut pas être négatif." };

  const result = await db.transaction(async (tx) => {
    const [v] = await tx.select().from(schema.productVariants).where(eq(schema.productVariants.id, variantId)).for("update");
    if (!v) return { error: "Variante introuvable." };
    const after = mode === "set" ? quantity : v.stock + quantity;
    if (after < 0) return { error: `Stock insuffisant : il reste ${v.stock} pièce(s).` };
    if (after === v.stock) return { error: "Le stock est déjà à cette valeur." };
    await tx.update(schema.productVariants).set({ stock: after, updatedAt: sql`now()` }).where(eq(schema.productVariants.id, variantId));
    await tx.insert(schema.inventoryMovements).values({ variantId, delta: after - v.stock, stockAfter: after, reason, userId: user.id, note: note || null });
    return { ok: true as const, before: v.stock, after, sku: v.sku };
  });
  if ("error" in result) return { error: result.error };
  await audit({ userId: user.id, action: "inventory.adjust", entityType: "variant", entityId: variantId, data: { ...result, reason, note } });
  revalidatePath("/admin/stocks");
  revalidatePath("/", "layout");
  return { ok: true, message: `${result.sku} : ${result.before} → ${result.after}` };
}
