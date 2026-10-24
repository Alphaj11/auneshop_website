"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { anonymizeUser } from "@/lib/gdpr";
import { verifyPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import type { FormState } from "./auth";

function errors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

async function requireCustomer() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const parsed = z
    .object({
      firstName: z.string().trim().min(1, "Prénom requis.").max(80),
      lastName: z.string().trim().min(1, "Nom requis.").max(80),
      phone: z.string().trim().max(30).optional(),
      marketing: z.string().optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: errors(parsed.error) };
  const marketing = parsed.data.marketing === "on";
  await db.update(schema.users).set({ firstName: parsed.data.firstName, lastName: parsed.data.lastName }).where(eq(schema.users.id, user.id));
  await db
    .insert(schema.customerProfiles)
    .values({ userId: user.id, phone: parsed.data.phone || null, acceptsMarketing: marketing, marketingConsentAt: marketing ? new Date() : null })
    .onConflictDoUpdate({
      target: schema.customerProfiles.userId,
      set: { phone: parsed.data.phone || null, acceptsMarketing: marketing, marketingConsentAt: marketing ? new Date() : null },
    });
  revalidatePath("/compte");
  return { ok: true, message: "Informations enregistrées." };
}

const addressSchema = z.object({
  label: z.string().trim().max(40).optional().default("Domicile"),
  firstName: z.string().trim().min(1, "Prénom requis.").max(80),
  lastName: z.string().trim().min(1, "Nom requis.").max(80),
  line1: z.string().trim().min(3, "Adresse requise.").max(200),
  line2: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().regex(/^[0-9A-Za-z -]{3,10}$/, "Code postal invalide."),
  city: z.string().trim().min(1, "Ville requise.").max(100),
  country: z.string().trim().length(2, "Pays invalide.").toUpperCase(),
  phone: z.string().trim().max(30).optional(),
});

export async function saveAddress(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: errors(parsed.error) };
  const settings = await getSettings();
  if (!settings.shipping.countries.includes(parsed.data.country)) return { fieldErrors: { country: "Nous ne livrons pas encore ce pays." } };
  const id = form.get("id");
  const makeDefault = form.get("isDefault") === "on";
  const values = { ...parsed.data, line2: parsed.data.line2 || null, phone: parsed.data.phone || null, isDefault: makeDefault };
  if (typeof id === "string" && id) {
    await db.update(schema.addresses).set(values).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)));
  } else {
    const count = await db.$count(schema.addresses, eq(schema.addresses.userId, user.id));
    if (count >= 10) return { error: "10 adresses maximum." };
    const [row] = await db.insert(schema.addresses).values({ ...values, userId: user.id, isDefault: makeDefault || count === 0 }).returning();
    if (makeDefault) await clearOtherDefaults(user.id, row.id);
    revalidatePath("/compte/adresses");
    return { ok: true, message: "Adresse ajoutée." };
  }
  if (makeDefault && typeof id === "string") await clearOtherDefaults(user.id, id);
  revalidatePath("/compte/adresses");
  return { ok: true, message: "Adresse enregistrée." };
}

async function clearOtherDefaults(userId: string, keepId: string) {
  await db.update(schema.addresses).set({ isDefault: false }).where(and(eq(schema.addresses.userId, userId), ne(schema.addresses.id, keepId)));
}

export async function deleteAddress(id: string) {
  const user = await requireCustomer();
  await db.delete(schema.addresses).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)));
  revalidatePath("/compte/adresses");
}

export async function sendInquiry(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Nom requis.").max(120),
      email: z.string().trim().toLowerCase().email("Email invalide.").max(200),
      subject: z.string().trim().min(2, "Objet requis.").max(150),
      message: z.string().trim().min(10, "Message trop court.").max(4000),
      orderId: z.string().uuid().optional().or(z.literal("")),
      website: z.string().max(0).optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true, message: "Message envoyé." };
    return { fieldErrors: errors(parsed.error) };
  }
  if (!(await rateLimit("inquiry", 5, 3600))) return { error: "Trop de messages envoyés. Réessayez plus tard." };
  let orderId: string | null = null;
  if (parsed.data.orderId && user) {
    const order = await db.query.orders.findFirst({ where: and(eq(schema.orders.id, parsed.data.orderId), eq(schema.orders.userId, user.id)) });
    if (order) orderId = order.id;
  }
  await db.insert(schema.inquiries).values({ ...parsed.data, orderId, userId: user?.id ?? null });
  if (orderId)
    await db.insert(schema.orderEvents).values({ orderId, type: "inquiry", message: `Question du client : ${parsed.data.subject}`, isInternal: false, userId: user?.id });
  const settings = await getSettings();
  await sendEmail({
    to: settings.store.email,
    subject: `[Contact] ${parsed.data.subject}`,
    text: `De : ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
  });
  return { ok: true, message: "Message envoyé. Nous vous répondons sous 48 h ouvrées." };
}

/**
 * Suppression de compte (RGPD) : les données personnelles du compte sont
 * effacées ; les commandes sont conservées pour les obligations comptables
 * (10 ans) mais détachées du compte.
 */
export async function deleteAccount(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireCustomer();
  if (user.role !== "customer") return { error: "Les comptes d'équipe sont supprimés par un super administrateur." };
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
  if (!row || !(await verifyPassword(row.passwordHash, String(form.get("password") ?? "")))) return { fieldErrors: { password: "Mot de passe incorrect." } };
  await anonymizeUser(user.id);
  await audit({ userId: user.id, action: "account.deleted_by_user", entityType: "user", entityId: user.id });
  await sendEmail({ to: user.email, subject: "Votre compte a été supprimé", text: "Votre compte Aune et vos données personnelles associées ont été supprimés. Les factures sont conservées pour nos obligations légales." });
  redirect("/?compte=supprime");
}
