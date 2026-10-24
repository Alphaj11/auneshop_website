import "server-only";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { computeTotals, type DiscountRule, type Totals } from "./pricing";
import { getSettings } from "./settings";
import { getCurrentUser } from "./auth/session";

export const CART_COOKIE = "aune_cart";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  size: string;
  color: string;
  colorHex: string | null;
  sku: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  /** Quantité maximale commandable (null = illimitée). */
  maxQuantity: number | null;
  isPreorder: boolean;
  problem?: string;
  /** Autres variantes du même produit (changement de taille ou couleur). */
  options: { variantId: string; size: string; color: string; available: boolean }[];
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  count: number;
  discountCode: string | null;
  totals: Totals;
  hasProblems: boolean;
};

export async function readCartId(): Promise<string | null> {
  const id = (await cookies()).get(CART_COOKIE)?.value;
  return id && UUID.test(id) ? id : null;
}

async function setCartCookie(id: string) {
  (await cookies()).set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // conservé 60 jours
  });
}

export async function clearCartCookie() {
  (await cookies()).delete(CART_COOKIE);
}

/** Retourne l'identifiant du panier courant, en le créant si besoin. */
export async function ensureCart(): Promise<string> {
  const user = await getCurrentUser();
  const existing = await readCartId();
  if (existing) {
    const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, existing) });
    if (cart) {
      if (user && !cart.userId) await db.update(schema.carts).set({ userId: user.id }).where(eq(schema.carts.id, cart.id));
      return cart.id;
    }
  }
  if (user) {
    const last = await db.query.carts.findFirst({
      where: eq(schema.carts.userId, user.id),
      orderBy: (c, { desc }) => [desc(c.updatedAt)],
    });
    if (last) {
      await setCartCookie(last.id);
      return last.id;
    }
  }
  const [cart] = await db.insert(schema.carts).values({ userId: user?.id ?? null }).returning();
  await setCartCookie(cart.id);
  return cart.id;
}

/** À la connexion : fusionne le panier invité avec le dernier panier du compte. */
export async function attachCartToUser(userId: string) {
  const guestId = await readCartId();
  const previous = await db.query.carts.findFirst({
    where: eq(schema.carts.userId, userId),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
  });
  if (!guestId) {
    if (previous) await setCartCookie(previous.id);
    return;
  }
  if (previous && previous.id !== guestId) {
    const items = await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, guestId));
    for (const it of items) {
      await db
        .insert(schema.cartItems)
        .values({ cartId: previous.id, variantId: it.variantId, quantity: it.quantity })
        .onConflictDoUpdate({
          target: [schema.cartItems.cartId, schema.cartItems.variantId],
          set: { quantity: sql`least(${schema.cartItems.quantity} + ${it.quantity}, 20)` },
        });
    }
    await db.delete(schema.carts).where(eq(schema.carts.id, guestId));
    await setCartCookie(previous.id);
  } else {
    await db.update(schema.carts).set({ userId }).where(eq(schema.carts.id, guestId));
  }
}

export async function findDiscount(code: string | null): Promise<(DiscountRule & { id: string }) | null> {
  if (!code) return null;
  const d = await db.query.discounts.findFirst({
    where: and(sql`upper(${schema.discounts.code}) = upper(${code})`, eq(schema.discounts.isActive, true)),
  });
  if (!d) return null;
  const now = new Date();
  if (d.startsAt && d.startsAt > now) return null;
  if (d.endsAt && d.endsAt < now) return null;
  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) return null;
  return { id: d.id, code: d.code, type: d.type, value: d.value, minSubtotalCents: d.minSubtotalCents };
}

export async function getCartView(cartId?: string | null): Promise<CartView> {
  const settings = await getSettings();
  const id = cartId === undefined ? await readCartId() : cartId;
  const empty: CartView = {
    id: null,
    lines: [],
    count: 0,
    discountCode: null,
    totals: computeTotals([], settings.shipping, null, settings.store.vatRate),
    hasProblems: false,
  };
  if (!id) return empty;
  const cart = await db.query.carts.findFirst({
    where: eq(schema.carts.id, id),
    with: {
      items: {
        orderBy: (i, { asc }) => [asc(i.createdAt)],
        with: {
          variant: {
            with: {
              product: {
                with: { images: { orderBy: (im, { asc }) => [asc(im.position)] }, variants: { orderBy: (v, { asc }) => [asc(v.position)] } },
              },
            },
          },
        },
      },
    },
  });
  if (!cart) return empty;

  const lines: CartLine[] = cart.items.map((item) => {
    const v = item.variant;
    const p = v.product;
    const img =
      p.images.find((i) => i.kind === "cutout" && i.color === v.color) ??
      p.images.find((i) => i.kind === "gallery" && i.color === v.color) ??
      p.images[0];
    let problem: string | undefined;
    const maxQuantity = v.trackInventory && settings.inventory.preventOverselling ? v.stock : null;
    if (p.status !== "active" || !v.isActive) problem = "Ce produit n'est plus disponible.";
    else if (maxQuantity !== null && maxQuantity <= 0) problem = "Rupture de stock pour cette variante.";
    else if (maxQuantity !== null && item.quantity > maxQuantity) problem = `Il ne reste que ${maxQuantity} pièce(s).`;
    return {
      id: item.id,
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      sku: v.sku,
      imageUrl: img?.url ?? null,
      unitPriceCents: v.priceCents ?? p.priceCents,
      quantity: item.quantity,
      maxQuantity,
      isPreorder: p.isPreorder,
      problem,
      options: p.variants
        .filter((o) => o.isActive)
        .map((o) => ({
          variantId: o.id,
          size: o.size,
          color: o.color,
          available: !o.trackInventory || !settings.inventory.preventOverselling || o.stock > 0,
        })),
    };
  });

  const valid = lines.filter((l) => !l.problem);
  const discount = await findDiscount(cart.discountCode);
  const totals = computeTotals(valid, settings.shipping, discount, settings.store.vatRate);
  return {
    id: cart.id,
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    discountCode: discount ? discount.code : null,
    totals,
    hasProblems: lines.some((l) => l.problem),
  };
}
