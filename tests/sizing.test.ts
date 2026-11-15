import { describe, expect, it } from "vitest";
import { recommendSize } from "../src/components/atelier/sizing";

const F = ["XS", "S", "M", "L", "XL", "2XL"];
const H = ["S", "M", "L", "XL", "2XL"];
const N = ["34", "36", "38", "40", "42", "44"];

describe("recommendSize (grille indicative)", () => {
  it("suit le poids sur la grille femme", () => {
    expect(recommendSize(165, 48, F)).toBe("XS");
    expect(recommendSize(165, 60, F)).toBe("M");
    expect(recommendSize(165, 90, F)).toBe("2XL");
  });
  it("monte d'une taille pour une grande taille", () => {
    expect(recommendSize(182, 60, F)).toBe("L");
  });
  it("commence à S sur la grille homme", () => {
    expect(recommendSize(178, 60, H)).toBe("S");
    expect(recommendSize(178, 78, H)).toBe("L");
  });
  it("convertit en tailles chiffrées", () => {
    expect(recommendSize(165, 60, N)).toBe("38");
  });
  it("retombe sur la taille disponible la plus proche", () => {
    expect(recommendSize(165, 48, ["M", "L"])).toBe("M");
    expect(recommendSize(165, 60, [])).toBeNull();
  });
});
