import "server-only";
import { computeTotals } from "./pricing";
import { getSettings } from "./settings";
import type { CartView } from "./cart.full";

export * from "./cart.full";

/** Vitrine statique : le panier est toujours vide (pas de commande possible). */
export async function getCartView(cartId?: string | null): Promise<CartView> {
  void cartId;
  const settings = await getSettings();
  return {
    id: null,
    lines: [],
    count: 0,
    discountCode: null,
    totals: computeTotals([], settings.shipping, null, settings.store.vatRate),
    hasProblems: false,
  };
}
