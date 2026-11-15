import "server-only";
import { cache } from "react";
import { snapshot } from "@/vitrine/store";
import { defaultSettings, settingsSchema, type StoreSettings } from "./settings-schema";

/** Réglages de la vitrine statique, lus dans l'instantané. */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  if (!snapshot.settings) return defaultSettings;
  const parsed = settingsSchema.safeParse(deepMerge(defaultSettings, snapshot.settings));
  return parsed.success ? parsed.data : defaultSettings;
});

export async function saveSettings(data: StoreSettings): Promise<void> {
  void data;
  throw new Error("Vitrine statique : les réglages ne s'enregistrent pas.");
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
