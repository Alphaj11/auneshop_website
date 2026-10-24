"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function toggleWishlist(productId: string): Promise<{ ok: boolean; inWishlist?: boolean; error?: string }> {
  if (!z.string().uuid().safeParse(productId).success) return { ok: false, error: "Produit invalide." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Connectez-vous pour ajouter des favoris." };
  const where = and(eq(schema.wishlistItems.userId, user.id), eq(schema.wishlistItems.productId, productId));
  const existing = await db.query.wishlistItems.findFirst({ where });
  if (existing) {
    await db.delete(schema.wishlistItems).where(where);
  } else {
    const product = await db.query.products.findFirst({ where: eq(schema.products.id, productId), columns: { id: true } });
    if (!product) return { ok: false, error: "Produit introuvable." };
    await db.insert(schema.wishlistItems).values({ userId: user.id, productId }).onConflictDoNothing();
  }
  revalidatePath("/compte/favoris");
  return { ok: true, inWishlist: !existing };
}
