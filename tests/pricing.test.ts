import { describe, expect, it } from "vitest";
import { computeTotals } from "../src/lib/pricing";
import { formatPrice, includedVat, parsePriceToCents } from "../src/lib/money";

const shipping = { flatRateCents: 590, freeThresholdCents: 15000 };

describe("computeTotals", () => {
  it("additionne les lignes et ajoute la livraison sous le seuil", () => {
    const t = computeTotals([{ unitPriceCents: 4990, quantity: 2 }], shipping, null);
    expect(t.subtotalCents).toBe(9980);
    expect(t.shippingCents).toBe(590);
    expect(t.totalCents).toBe(10570);
    expect(t.freeShippingRemainingCents).toBe(5020);
  });

  it("offre la livraison au-delà du seuil", () => {
    const t = computeTotals([{ unitPriceCents: 15000, quantity: 1 }], shipping, null);
    expect(t.shippingCents).toBe(0);
  });

  it("applique un pourcentage arrondi au centime sans erreur de flottant", () => {
    const t = computeTotals([{ unitPriceCents: 3333, quantity: 3 }], shipping, {
      code: "X", type: "percent", value: 10, minSubtotalCents: 0,
    });
    expect(t.subtotalCents).toBe(9999);
    expect(t.discountCents).toBe(1000);
    expect(t.totalCents).toBe(9999 - 1000 + 590);
  });

  it("le seuil de livraison gratuite se calcule après réduction", () => {
    const t = computeTotals([{ unitPriceCents: 16000, quantity: 1 }], shipping, {
      code: "X", type: "percent", value: 10, minSubtotalCents: 0,
    });
    expect(t.discountCents).toBe(1600);
    expect(t.shippingCents).toBe(590);
  });

  it("une remise fixe ne rend jamais le total négatif", () => {
    const t = computeTotals([{ unitPriceCents: 1000, quantity: 1 }], shipping, {
      code: "X", type: "fixed", value: 5000, minSubtotalCents: 0,
    });
    expect(t.discountCents).toBe(1000);
    expect(t.totalCents).toBe(590);
  });

  it("refuse un code sous le minimum d'achat", () => {
    const t = computeTotals([{ unitPriceCents: 1000, quantity: 1 }], shipping, {
      code: "X", type: "fixed", value: 500, minSubtotalCents: 5000,
    });
    expect(t.discountApplied).toBe(false);
    expect(t.discountCents).toBe(0);
    expect(t.discountMessage).toBeTruthy();
  });

  it("code livraison offerte", () => {
    const t = computeTotals([{ unitPriceCents: 1000, quantity: 1 }], shipping, {
      code: "L", type: "free_shipping", value: 0, minSubtotalCents: 0,
    });
    expect(t.shippingCents).toBe(0);
    expect(t.totalCents).toBe(1000);
  });

  it("panier vide : pas de frais de port", () => {
    expect(computeTotals([], shipping, null).totalCents).toBe(0);
  });

  it("TVA incluse ventilée", () => {
    expect(includedVat(12000, 20)).toBe(2000);
  });
});

describe("money", () => {
  it("parse les saisies françaises", () => {
    expect(parsePriceToCents("12,90")).toBe(1290);
    expect(parsePriceToCents("0.1")).toBe(10);
    expect(parsePriceToCents("110")).toBe(11000);
    expect(parsePriceToCents("12,999")).toBeNull();
    expect(parsePriceToCents("-3")).toBeNull();
  });
  it("formate en euros", () => {
    expect(formatPrice(11000).replace(/\s/g, " ")).toBe("110,00 €");
  });
});
