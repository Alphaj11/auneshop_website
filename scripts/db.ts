import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

/** Connexion pour les scripts en ligne de commande (hors Next.js). */
export function scriptDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end(), schema };
}
