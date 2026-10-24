import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { clientIp } from "./request";

/**
 * Limiteur à fenêtre fixe stocké en base (fonctionne avec plusieurs instances).
 * Retourne true si la requête est autorisée.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number, subject?: string) {
  const key = `${bucket}:${subject ?? (await clientIp())}`;
  const resetAt = new Date(Date.now() + windowSeconds * 1000);
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`CASE WHEN ${schema.rateLimits.resetAt} < now() THEN 1 ELSE ${schema.rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${schema.rateLimits.resetAt} < now() THEN ${resetAt.toISOString()}::timestamptz ELSE ${schema.rateLimits.resetAt} END`,
      },
    })
    .returning({ count: schema.rateLimits.count });
  return (row?.count ?? 0) <= limit;
}
