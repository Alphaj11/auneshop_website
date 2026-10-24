import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Paramètres Argon2id recommandés par l'OWASP (19 MiB, 2 itérations).
const options = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string) {
  return hash(password, options);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | null = null;
/** Vérifie un mot de passe contre un hash factice pour garder un temps de réponse constant. */
export async function fakeVerify(password: string) {
  dummy ??= hashPassword("aune-dummy-password");
  await verifyPassword(await dummy, password);
  return false;
}
