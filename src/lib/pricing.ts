import { includedVat, percentOf } from "./money";

/**
 * Calcul des montants d'un panier ou d'une commande, en centimes.
 * Prix TTC (B2C France) : la TVA est incluse et ventilée à titre informatif.
 * Fonction pure, testée dans tests/pricing.test.ts.
 */

export type PricingLine = { unitPriceCents: number; quantity: number };

export type DiscountRule = {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minSubtotalCents: number;
};

export type ShippingRule = { flatRateCents: number; freeThresholdCents: number | null };

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  taxCents: number;
  discountApplied: boolean;
  discountMessage?: string;
  freeShippingRemainingCents: number | null;
};

export function computeTotals(
  lines: PricingLine[],
  shipping: ShippingRule,
  discount: DiscountRule | null,
  vatRate = 20,
): Totals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  let discountCents = 0;
  let freeShipping = false;
  let discountApplied = false;
  let discountMessage: string | undefined;

  if (discount) {
    if (subtotalCents < discount.minSubtotalCents) {
      discountMessage = `Ce code s'applique dès ${(discount.minSubtotalCents / 100).toFixed(0)} € d'achat.`;
    } else {
      discountApplied = true;
      if (discount.type === "percent") discountCents = percentOf(subtotalCents, discount.value);
      if (discount.type === "fixed") discountCents = Math.min(discount.value, subtotalCents);
      if (discount.type === "free_shipping") freeShipping = true;
    }
  }

  const discounted = subtotalCents - discountCents;
  const qualifiesFree = shipping.freeThresholdCents !== null && discounted >= shipping.freeThresholdCents;
  const shippingCents = lines.length === 0 || freeShipping || qualifiesFree ? 0 : shipping.flatRateCents;
  const totalCents = discounted + shippingCents;

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents,
    taxCents: includedVat(totalCents, vatRate),
    discountApplied,
    discountMessage,
    freeShippingRemainingCents:
      shipping.freeThresholdCents === null || lines.length === 0
        ? null
        : Math.max(0, shipping.freeThresholdCents - discounted),
  };
}
