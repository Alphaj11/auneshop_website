"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { parsePriceToCents } from "@/lib/money";
import { getSettings, saveSettings } from "@/lib/settings";
import { settingsSchema, type StoreSettings } from "@/lib/settings-schema";
import { UploadError, saveImage } from "@/lib/storage";
import type { ActionResult } from "@/components/admin/ActionForm";

type Section = keyof StoreSettings;
const contentSections: Section[] = ["intro", "experience"];
const imageFields: Partial<Record<Section, string[]>> = { store: ["logoUrl"], seo: ["ogImageUrl"], intro: ["garmentImageUrl"] };
const httpsOnly = /^https:\/\/[^\s]+$/;

/**
 * Enregistre une section des réglages. Les champs sont convertis selon le type
 * attendu par le schéma (case à cocher, nombre, prix en euros → centimes, liste).
 */
export async function saveSettingsSection(_: ActionResult, form: FormData): Promise<ActionResult> {
  const section = String(form.get("section")) as Section;
  if (!(section in settingsSchema.shape)) return { error: "Section inconnue." };
  const user = await requirePermission(contentSections.includes(section) ? "content.manage" : "settings.manage");
  const current = await getSettings();
  const next: Record<string, unknown> = { ...current[section] };

  for (const [key, value] of Object.entries(current[section])) {
    const field = `f.${key}`;
    if (key === "freeThresholdCents") continue;
    if (typeof value === "boolean") next[key] = form.get(field) === "on";
    else if (!form.has(field)) continue;
    else if (key.endsWith("Cents")) {
      next[key] = parsePriceToCents(String(form.get(field)).trim());
      if (next[key] === null) return { error: "Montant invalide." };
    } else if (typeof value === "number") next[key] = Number(String(form.get(field)).replace(",", "."));
    else if (Array.isArray(value))
      next[key] = String(form.get(field))
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    else next[key] = String(form.get(field)).trim();
  }
  // Seuil de livraison offerte : vide = jamais offerte.
  if (section === "shipping" && form.has("f.freeThresholdCents")) {
    const raw = String(form.get("f.freeThresholdCents")).trim();
    next.freeThresholdCents = raw === "" ? null : parsePriceToCents(raw);
    if (raw !== "" && next.freeThresholdCents === null) return { error: "Seuil de livraison offerte invalide." };
  }

  for (const key of imageFields[section] ?? []) {
    const file = form.get(`file.${key}`);
    if (file instanceof File && file.size > 0) {
      try {
        next[key] = await saveImage(file, "settings");
      } catch (e) {
        return { error: e instanceof UploadError ? e.message : "Téléversement impossible." };
      }
    } else if (form.get(`remove.${key}`) === "on") next[key] = "";
  }

  if (section === "social")
    for (const [k, v] of Object.entries(next)) if (v && !httpsOnly.test(String(v))) return { error: `Le lien ${k} doit commencer par https://` };
  if (section === "intro" && form.get("replay") === "on") next.version = current.intro.version + 1;

  const parsed = settingsSchema.shape[section].safeParse(next);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Valeur invalide pour « ${String(issue?.path[0] ?? "")} » : ${issue?.message ?? ""}` };
  }
  await saveSettings({ ...current, [section]: parsed.data });
  await audit({ userId: user.id, action: `settings.${section}`, entityType: "settings", data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true, message: section === "intro" && form.get("replay") === "on" ? "Enregistré : l'introduction sera rejouée pour tous les visiteurs." : "Réglages enregistrés." };
}

export async function resetIntroDefaults(_: ActionResult): Promise<ActionResult> {
  const user = await requirePermission("content.manage");
  const current = await getSettings();
  const { defaultSettings } = await import("@/lib/settings-schema");
  await saveSettings({ ...current, intro: { ...defaultSettings.intro, version: current.intro.version + 1 } });
  await audit({ userId: user.id, action: "settings.intro.reset", entityType: "settings" });
  revalidatePath("/", "layout");
  return { ok: true, message: "Introduction réinitialisée." };
}

