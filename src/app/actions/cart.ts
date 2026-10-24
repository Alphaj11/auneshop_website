"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ensureCart, findDiscount, getCartView, readCartId, type CartView } from "@/lib/cart";
import { getSettings } from "@/lib/settings";
import { rateLimit } from "@/lib/rate-limit";

export type CartResult = { ok: true; cart: CartView; message?: string } | { ok: false; error: string; cart?: CartView };

const uuid = z.string().uuid();
const qty = z.number().int().min(1).max(20);

async function variantStatus(variantId: string) {
  const v = await db.query.productVariants.findFirst({
    where: eq(schema.productVariants.id, variantId),
    with: { product: { columns: { status: true, name: true } } },
  });
  if (!v || !v.isActive || v.product.status !== "active") return { error: "Ce produit n'est pas disponible." } as const;
  const settings = await getSettings();
  const limit = v.trackInventory && settings.inventory.preventOverselling ? v.stock : null;
  return { v, limit } as const;
}

export async function addToCart(variantId: string, quantity = 1): Promise<CartResult> {
  if (!uuid.safeParse(variantId).success || !qty.safeParse(quantity).success) return { ok: false, error: "Demande invalide." };
  if (!(await rateLimit("cart", 120, 60))) return { ok: false, error: "Trop de requêtes, réessayez dans un instant." };
  const status = await variantStatus(variantId);
  if ("error" in status) return { ok: false, error: status.error! };
  const cartId = await ensureCart();
  const existing = await db.query.cartItems.findFirst({
    where: and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variantId)),
  });
  const wanted = Math.min(20, (existing?.quantity ?? 0) + quantity);
  if (status.limit !== null && wanted > status.limit) {
    return {
      ok: false,
      error: status.limit <= 0 ? "Cette taille est en rupture de stock." : `Il ne reste que ${status.limit} pièce(s) dans cette taille.`,
      cart: await getCartView(cartId),
    };
  }
  await db
    .insert(schema.cartItems)
    .values({ cartId, variantId, quantity: wanted })
    .onConflictDoUpdate({ target: [schema.cartItems.cartId, schema.cartItems.variantId], set: { quantity: wanted } });
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
  return { ok: true, cart: await getCartView(cartId), message: `${status.v.product.name} ajouté au panier.` };
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartResult> {
  const cartId = await readCartId();
  if (!cartId || !uuid.safeParse(itemId).success) return { ok: false, error: "Panier introuvable." };
  if (quantity <= 0) return removeCartItem(itemId);
  if (!qty.safeParse(quantity).success) return { ok: false, error: "Quantité invalide (20 maximum)." };
  const item = await db.query.cartItems.findFirst({
    where: and(eq(schema.cartItems.id, itemId), eq(schema.cartItems.cartId, cartId)),
  });
  if (!item) return { ok: false, error: "Article introuvable." };
  const status = await variantStatus(item.variantId);
  if ("error" in status) return { ok: false, error: status.error!, cart: await getCartView(cartId) };
  if (status.limit !== null && quantity > status.limit)
    return { ok: false, error: `Il ne reste que ${status.limit} pièce(s).`, cart: await getCartView(cartId) };
  await db.update(schema.cartItems).set({ quantity }).where(eq(schema.cartItems.id, itemId));
  return { ok: true, cart: await getCartView(cartId) };
}

export async function removeCartItem(itemId: string): Promise<CartResult> {
  const cartId = await readCartId();
  if (!cartId || !uuid.safeParse(itemId).success) return { ok: false, error: "Panier introuvable." };
  await db.delete(schema.cartItems).where(and(eq(schema.cartItems.id, itemId), eq(schema.cartItems.cartId, cartId)));
  return { ok: true, cart: await getCartView(cartId) };
}

/** Change la taille ou la couleur d'une ligne du panier. */
export async function changeCartVariant(itemId: string, variantId: string): Promise<CartResult> {
  const cartId = await readCartId();
  if (!cartId || !uuid.safeParse(itemId).success || !uuid.safeParse(variantId).success)
    return { ok: false, error: "Demande invalide." };
  const item = await db.query.cartItems.findFirst({
    where: and(eq(schema.cartItems.id, itemId), eq(schema.cartItems.cartId, cartId)),
    with: { variant: true },
  });
  if (!item) return { ok: false, error: "Article introuvable." };
  const status = await variantStatus(variantId);
  if ("error" in status) return { ok: false, error: status.error!, cart: await getCartView(cartId) };
  if (status.v.productId !== item.variant.productId) return { ok: false, error: "Variante invalide." };
  if (status.limit !== null && status.limit < 1)
    return { ok: false, error: "Cette variante est en rupture de stock.", cart: await getCartView(cartId) };
  const quantity = status.limit !== null ? Math.min(item.quantity, status.limit) : item.quantity;
  await db.transaction(async (tx) => {
    await tx.delete(schema.cartItems).where(eq(schema.cartItems.id, itemId));
    await tx
      .insert(schema.cartItems)
      .values({ cartId, variantId, quantity })
      .onConflictDoUpdate({
        target: [schema.cartItems.cartId, schema.cartItems.variantId],
        set: { quantity: sql`least(${schema.cartItems.quantity} + ${quantity}, 20)` },
      });
  });
  return { ok: true, cart: await getCartView(cartId) };
}

export async function applyDiscountCode(code: string): Promise<CartResult> {
  if (!(await rateLimit("discount", 20, 300))) return { ok: false, error: "Trop de tentatives. Réessayez plus tard." };
  const clean = code.trim().slice(0, 40);
  const cartId = await ensureCart();
  if (!clean) {
    await db.update(schema.carts).set({ discountCode: null }).where(eq(schema.carts.id, cartId));
    return { ok: true, cart: await getCartView(cartId) };
  }
  const discount = await findDiscount(clean);
  if (!discount) return { ok: false, error: "Ce code n'est pas valide ou a expiré.", cart: await getCartView(cartId) };
  await db.update(schema.carts).set({ discountCode: discount.code }).where(eq(schema.carts.id, cartId));
  const cart = await getCartView(cartId);
  if (!cart.totals.discountApplied) return { ok: false, error: cart.totals.discountMessage ?? "Code non applicable.", cart };
  return { ok: true, cart, message: "Code appliqué." };
}

export async function fetchCart(): Promise<CartView> {
  return getCartView();
}
