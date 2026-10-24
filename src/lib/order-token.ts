import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET manquant ou trop court (32 caractères minimum).");
  return s;
}

/** Jeton d'accès à la page de confirmation d'une commande (achat invité). */
export function orderAccessToken(orderId: string) {
  return createHmac("sha256", secret()).update(`order:${orderId}`).digest("base64url").slice(0, 32);
}

export function verifyOrderAccessToken(orderId: string, token: string | undefined | null) {
  if (!token) return false;
  const expected = Buffer.from(orderAccessToken(orderId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
