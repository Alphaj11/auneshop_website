import { z } from "zod";

/**
 * Qamar : les demandes de l'équipe Aune aux concepteurs du site (demandes, améliorations,
 * problèmes). Validation pure, partagée par les actions serveur et les tests.
 */

export const QAMAR_TYPES = ["demande", "amelioration", "probleme"] as const;
export const QAMAR_PRIORITIES = ["basse", "normale", "haute", "urgente"] as const;
export const QAMAR_STATUSES = ["nouveau", "en_cours", "resolu"] as const;

export type QamarType = (typeof QAMAR_TYPES)[number];
export type QamarPriority = (typeof QAMAR_PRIORITIES)[number];
export type QamarStatus = (typeof QAMAR_STATUSES)[number];

export const typeLabels: Record<QamarType, string> = { demande: "Demande", amelioration: "Amélioration", probleme: "Problème" };
export const priorityLabels: Record<QamarPriority, string> = { basse: "Basse", normale: "Normale", haute: "Haute", urgente: "Urgente" };
export const statusLabels: Record<QamarStatus, string> = { nouveau: "Nouveau", en_cours: "En cours", resolu: "Résolu" };

/** Pièces jointes : 6 images, 8 Mo chacune, 9 Mo en tout (l'envoi d'une action est limité à 10 Mo). */
export const MAX_FILES = 6;
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 9 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const pageUrl = z
  .string()
  .trim()
  .max(500, "Adresse trop longue.")
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\/[^\s]+$/i.test(v), "Indiquez une adresse (https://…) ou un chemin (/produits/…).")
  .transform((v) => v || null);

export const requestSchema = z.object({
  type: z.enum(QAMAR_TYPES, { message: "Choisissez un type." }),
  priority: z.enum(QAMAR_PRIORITIES, { message: "Choisissez une priorité." }),
  title: z.string().trim().min(4, "Titre trop court (4 caractères minimum).").max(140, "Titre trop long (140 caractères maximum)."),
  description: z.string().trim().min(10, "Décrivez la demande (10 caractères minimum).").max(5000, "Description trop longue (5 000 caractères maximum)."),
  pageUrl,
});

export const replySchema = z.object({
  message: z.string().trim().min(2, "Message vide.").max(5000, "Message trop long (5 000 caractères maximum)."),
});

export const statusSchema = z.enum(QAMAR_STATUSES, { message: "Statut inconnu." });

/** Champs d'une demande, depuis un formulaire. */
export function parseRequest(form: FormData) {
  return requestSchema.safeParse({
    type: form.get("type"),
    priority: form.get("priority") ?? "normale",
    title: String(form.get("title") ?? ""),
    description: String(form.get("description") ?? ""),
    pageUrl: String(form.get("pageUrl") ?? ""),
  });
}

/** Vérifie les pièces jointes avant l'enregistrement (le contenu réel est revérifié par saveImage). */
export function checkAttachments(files: { size: number; type: string }[]): string | null {
  const real = files.filter((f) => f.size > 0);
  if (real.length > MAX_FILES) return `${MAX_FILES} images au maximum.`;
  if (real.some((f) => f.size > MAX_FILE_BYTES)) return "Une image dépasse 8 Mo.";
  if (real.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) return "Les images dépassent 9 Mo au total.";
  if (real.some((f) => f.type && !IMAGE_TYPES.includes(f.type))) return "Images uniquement (JPEG, PNG, WebP ou AVIF).";
  return null;
}

/** Erreurs zod → { champ: premier message }. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
