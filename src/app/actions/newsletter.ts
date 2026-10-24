"use server";

import { sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { randomToken } from "@/lib/auth/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { appUrl, sendEmail } from "@/lib/email";

export type NewsletterState = { ok?: boolean; error?: string; fieldErrors?: { email?: string; consent?: string } };

const schemaInput = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide.").max(200),
  consent: z.literal("on", { message: "Merci de cocher la case de consentement." }),
  source: z.string().max(40).optional(),
  website: z.string().max(0).optional(), // champ piège anti-robots
});

export async function subscribeNewsletter(_: NewsletterState, form: FormData): Promise<NewsletterState> {
  const parsed = schemaInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    if (f.website) return { ok: true }; // robot : on ne dit rien
    return { fieldErrors: { email: f.email?.[0], consent: f.consent?.[0] } };
  }
  if (!(await rateLimit("newsletter", 5, 3600))) return { error: "Trop de tentatives. Réessayez plus tard." };
  const settings = await getSettings();
  const token = randomToken(24);
  const existing = await db.query.newsletterSubscribers.findFirst({
    where: sql`lower(${schema.newsletterSubscribers.email}) = ${parsed.data.email}`,
  });
  let unsubscribeToken = token;
  if (existing) {
    unsubscribeToken = existing.unsubscribeToken;
    await db
      .update(schema.newsletterSubscribers)
      .set({ status: "subscribed", consentText: settings.newsletter.consentText, consentAt: new Date(), unsubscribedAt: null })
      .where(sql`${schema.newsletterSubscribers.id} = ${existing.id}`);
  } else {
    await db.insert(schema.newsletterSubscribers).values({
      email: parsed.data.email,
      consentText: settings.newsletter.consentText,
      source: parsed.data.source ?? "site",
      unsubscribeToken: token,
    });
  }
  await sendEmail({
    to: parsed.data.email,
    subject: "Bienvenue dans les lettres de l'atelier",
    text: `Merci pour votre inscription à la newsletter ${settings.store.name}.\n\nPour vous désinscrire à tout moment : ${appUrl(`/newsletter/desinscription?token=${unsubscribeToken}`)}`,
  });
  return { ok: true };
}
