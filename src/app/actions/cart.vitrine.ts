import type { CartView } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { VITRINE_ORDER_NOTICE } from "@/lib/site-mode";

/** Vitrine statique : pas de panier, chaque action renvoie l'avis de démonstration. */

export type CartResult = { ok: true; cart: CartView; message?: string } | { ok: false; error: string; cart?: CartView };

const empty = (): CartView => ({
  id: null,
  lines: [],
  count: 0,
  discountCode: null,
  totals: computeTotals([], { flatRateCents: 0, freeThresholdCents: null }, null),
  hasProblems: false,
});
const notice = async (): Promise<CartResult> => ({ ok: false, error: VITRINE_ORDER_NOTICE });

export const addToCart = (variantId: string, quantity = 1) => (void variantId, void quantity, notice());
export const updateCartItem = (itemId: string, quantity: number) => (void itemId, void quantity, notice());
export const removeCartItem = (itemId: string) => (void itemId, notice());
export const changeCartVariant = (itemId: string, variantId: string) => (void itemId, void variantId, notice());
export const applyDiscountCode = (code: string) => (void code, notice());
export const fetchCart = async (): Promise<CartView> => empty();
