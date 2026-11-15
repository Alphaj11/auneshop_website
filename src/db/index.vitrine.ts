import "server-only";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/** Vitrine statique : aucune base de données. Toute requête signale une erreur explicite. */
const missing = () => {
  throw new Error("La vitrine statique n'a pas de base de données (voir src/vitrine/store.ts).");
};

export const db = new Proxy({}, { get: missing }) as unknown as PostgresJsDatabase<typeof schema>;
export type DB = typeof db;
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export { schema };
