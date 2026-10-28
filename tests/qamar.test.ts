import { describe, expect, it } from "vitest";
import { checkAttachments, fieldErrors, parseRequest, replySchema, statusSchema } from "../src/lib/qamar";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const valid = { type: "probleme", priority: "haute", title: "Le panier se vide", description: "Après la connexion, le panier est vide sur mobile.", pageUrl: "" };
const MB = 1024 * 1024;

describe("Qamar : validation d'une demande", () => {
  it("accepte une demande complète et nettoie l'adresse vide", () => {
    const r = parseRequest(form(valid));
    expect(r.success).toBe(true);
    expect(r.data?.pageUrl).toBeNull();
  });
  it("accepte un chemin ou une adresse https", () => {
    expect(parseRequest(form({ ...valid, pageUrl: "/produits/robe" })).data?.pageUrl).toBe("/produits/robe");
    expect(parseRequest(form({ ...valid, pageUrl: "https://auneshop.fr/le-projet" })).success).toBe(true);
  });
  it("refuse les adresses javascript: ou sans protocole", () => {
    expect(parseRequest(form({ ...valid, pageUrl: "javascript:alert(1)" })).success).toBe(false);
    expect(parseRequest(form({ ...valid, pageUrl: "auneshop.fr" })).success).toBe(false);
  });
  it("refuse un type ou une priorité inconnus", () => {
    expect(parseRequest(form({ ...valid, type: "bug" })).success).toBe(false);
    expect(parseRequest(form({ ...valid, priority: "critique" })).success).toBe(false);
  });
  it("met la priorité « normale » par défaut", () => {
    const f = form(valid);
    f.delete("priority");
    expect(parseRequest(f).data?.priority).toBe("normale");
  });
  it("signale titre et description trop courts, champ par champ", () => {
    const r = parseRequest(form({ ...valid, title: " ab ", description: "court" }));
    expect(r.success).toBe(false);
    const errs = fieldErrors(r.error!);
    expect(errs.title).toMatch(/court/);
    expect(errs.description).toMatch(/10 caractères/);
  });
  it("limite la longueur du titre", () => {
    expect(parseRequest(form({ ...valid, title: "x".repeat(141) })).success).toBe(false);
  });
});

describe("Qamar : pièces jointes", () => {
  it("accepte aucune image, ou des images raisonnables", () => {
    expect(checkAttachments([])).toBeNull();
    expect(checkAttachments([{ size: 0, type: "application/octet-stream" }])).toBeNull(); // champ fichier vide
    expect(checkAttachments([{ size: 2 * MB, type: "image/jpeg" }, { size: 3 * MB, type: "image/png" }])).toBeNull();
  });
  it("refuse plus de 6 images", () => {
    expect(checkAttachments(Array.from({ length: 7 }, () => ({ size: 1000, type: "image/png" })))).toMatch(/6 images/);
  });
  it("refuse une image de plus de 8 Mo et un total de plus de 9 Mo", () => {
    expect(checkAttachments([{ size: 8 * MB + 1, type: "image/jpeg" }])).toMatch(/8 Mo/);
    expect(checkAttachments([{ size: 5 * MB, type: "image/jpeg" }, { size: 5 * MB, type: "image/jpeg" }])).toMatch(/9 Mo/);
  });
  it("refuse les fichiers qui ne sont pas des images", () => {
    expect(checkAttachments([{ size: 1000, type: "image/svg+xml" }])).toMatch(/Images uniquement/);
    expect(checkAttachments([{ size: 1000, type: "application/pdf" }])).toMatch(/Images uniquement/);
  });
});

describe("Qamar : réponses et statuts", () => {
  it("valide une réponse", () => {
    expect(replySchema.safeParse({ message: "  " }).success).toBe(false);
    expect(replySchema.safeParse({ message: "C'est corrigé." }).success).toBe(true);
  });
  it("ne connaît que trois statuts", () => {
    expect(statusSchema.safeParse("en_cours").success).toBe(true);
    expect(statusSchema.safeParse("ferme").success).toBe(false);
  });
});
