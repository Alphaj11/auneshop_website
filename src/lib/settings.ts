import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { defaultSettings, settingsSchema, type StoreSettings } from "./settings-schema";

/** Réglages de la boutique, fusionnés avec les valeurs par défaut. Mis en cache par requête. */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  const row = await db.query.storeSettings.findFirst({ where: eq(schema.storeSettings.id, 1) });
  if (!row) return defaultSettings;
  const merged = deepMerge(defaultSettings, row.data as Partial<StoreSettings>);
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultSettings;
});

export async function saveSettings(data: StoreSettings) {
  const valid = settingsSchema.parse(data);
  await db
    .insert(schema.storeSettings)
    .values({ id: 1, data: valid })
    .onConflictDoUpdate({ target: schema.storeSettings.id, set: { data: valid } });
}

function deepMerge<T>(base: T, override: unknown): T {
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    return (override === undefined ? base : override) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  if (override && typeof override === "object") {
    for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
      out[k] = deepMerge((base as Record<string, unknown>)[k], v);
    }
  }
  return out as T;
}
