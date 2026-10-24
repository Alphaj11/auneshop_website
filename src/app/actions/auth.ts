"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { attachCartToUser } from "@/lib/cart";
import { appUrl, sendEmail } from "@/lib/email";
import { fakeVerify, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions, destroySession, getCurrentUser } from "@/lib/auth/session";
import { randomToken, sha256 } from "@/lib/auth/tokens";
import { isStaff } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/rate-limit";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string | undefined>; message?: string };

const email = z.string().trim().toLowerCase().email("Adresse email invalide.").max(200);
const password = z
  .string()
  .min(10, "10 caractères minimum.")
  .max(200)
  .refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), "Utilisez au moins une lettre et un chiffre.");

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

/** N'autorise que les redirections internes (évite les redirections ouvertes). */
function safeNext(next: unknown, fallback = "/compte") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1, "Mot de passe requis.").max(200) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const staffArea = form.get("area") === "admin";
  // Limitation par IP et par compte.
  if (!(await rateLimit("login-ip", 20, 900)) || !(await rateLimit("login-email", 8, 900, parsed.data.email)))
    return { error: "Trop de tentatives. Réessayez dans 15 minutes." };

  const user = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${parsed.data.email}` });
  const valid = user && user.isActive ? await verifyPassword(user.passwordHash, parsed.data.password) : await fakeVerify(parsed.data.password);
  if (!user || !valid || !user.isActive) {
    if (user) await audit({ userId: user.id, action: "auth.login_failed", entityType: "user", entityId: user.id });
    return { error: "Email ou mot de passe incorrect." };
  }
  if (staffArea && !isStaff(user.role)) return { error: "Ce compte n'a pas accès à l'administration." };

  await createSession(user.id, user.role);
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  if (isStaff(user.role)) await audit({ userId: user.id, action: "auth.login", entityType: "user", entityId: user.id });
  if (!staffArea) await attachCartToUser(user.id);
  redirect(staffArea ? "/admin" : safeNext(form.get("next")));
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      firstName: z.string().trim().min(1, "Prénom requis.").max(80),
      lastName: z.string().trim().min(1, "Nom requis.").max(80),
      email,
      password,
      marketing: z.string().optional(),
      terms: z.literal("on", { message: "Merci d'accepter les conditions." }),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("register", 5, 3600))) return { error: "Trop de créations de compte. Réessayez plus tard." };

  const exists = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${parsed.data.email}` });
  if (exists) return { fieldErrors: { email: "Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe." } };

  const [user] = await db
    .insert(schema.users)
    .values({
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    })
    .returning();
  const marketing = parsed.data.marketing === "on";
  await db.insert(schema.customerProfiles).values({ userId: user.id, acceptsMarketing: marketing, marketingConsentAt: marketing ? new Date() : null });
  await createSession(user.id, "customer");
  await attachCartToUser(user.id);
  await sendEmail({
    to: user.email,
    subject: "Bienvenue chez Aune",
    text: `Bonjour ${user.firstName},\n\nVotre compte est créé. Vous pouvez suivre vos commandes et retrouver vos favoris depuis votre espace : ${appUrl("/compte")}`,
  });
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("reset", 5, 3600))) return { error: "Trop de demandes. Réessayez plus tard." };
  const user = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${parsed.data.email}` });
  if (user && user.isActive) {
    const token = randomToken();
    await db.insert(schema.passwordResetTokens).values({ tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) });
    await sendEmail({
      to: user.email,
      subject: "Réinitialisation de votre mot de passe",
      text: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${appUrl(`/reinitialiser/${token}`)}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    });
  }
  // Même réponse que le compte existe ou non (pas d'énumération des emails).
  return { ok: true, message: "Si un compte existe pour cette adresse, un email vient d'être envoyé." };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ token: z.string().min(10).max(100), password }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const row = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(schema.passwordResetTokens.tokenHash, sha256(parsed.data.token)),
      isNull(schema.passwordResetTokens.usedAt),
      gt(schema.passwordResetTokens.expiresAt, new Date()),
    ),
  });
  if (!row) return { error: "Ce lien a expiré ou a déjà été utilisé. Faites une nouvelle demande." };
  await db.transaction(async (tx) => {
    await tx.update(schema.users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(schema.users.id, row.userId));
    await tx.update(schema.passwordResetTokens).set({ usedAt: new Date() }).where(eq(schema.passwordResetTokens.tokenHash, row.tokenHash));
  });
  await destroyAllSessions(row.userId);
  await audit({ userId: row.userId, action: "auth.password_reset", entityType: "user", entityId: row.userId });
  return { ok: true, message: "Mot de passe modifié. Vous pouvez vous connecter." };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Session expirée." };
  const parsed = z.object({ current: z.string().min(1, "Requis."), password }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
  if (!row || !(await verifyPassword(row.passwordHash, parsed.data.current))) return { fieldErrors: { current: "Mot de passe actuel incorrect." } };
  await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(schema.users.id, user.id));
  await destroyAllSessions(user.id);
  await createSession(user.id, user.role);
  await audit({ userId: user.id, action: "auth.password_changed", entityType: "user", entityId: user.id });
  return { ok: true, message: "Mot de passe modifié. Vos autres sessions ont été déconnectées." };
}
