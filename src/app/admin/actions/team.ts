"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { roleLabels, type Role } from "@/lib/auth/permissions";
import { destroyAllSessions } from "@/lib/auth/session";
import { randomToken, sha256 } from "@/lib/auth/tokens";
import { appUrl, sendEmail } from "@/lib/email";
import type { ActionResult } from "@/components/admin/ActionForm";

const staffRoles = ["order_manager", "store_manager", "super_admin"] as const;

async function otherActiveSuperAdmins(exceptId: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.users)
    .where(and(eq(schema.users.role, "super_admin"), eq(schema.users.isActive, true), ne(schema.users.id, exceptId)));
  return n;
}

/** Invite un membre : le compte est créé sans mot de passe utilisable, l'invité choisit le sien via un lien. */
export async function inviteMember(_: ActionResult, form: FormData): Promise<ActionResult> {
  const admin = await requirePermission("team.manage");
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email(), firstName: z.string().trim().max(60), lastName: z.string().trim().max(60), role: z.enum(staffRoles) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Email ou rôle invalide." };
  const { email, firstName, lastName, role } = parsed.data;
  const existing = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}` });
  if (existing && existing.role !== "customer") return { error: "Cette personne fait déjà partie de l'équipe." };

  let userId: string;
  if (existing) {
    await db.update(schema.users).set({ role, isActive: true }).where(eq(schema.users.id, existing.id));
    await destroyAllSessions(existing.id);
    userId = existing.id;
  } else {
    const [created] = await db
      .insert(schema.users)
      .values({ email, firstName, lastName, role, passwordHash: await hashPassword(randomToken()) })
      .returning({ id: schema.users.id });
    userId = created.id;
  }
  const token = randomToken();
  await db.insert(schema.passwordResetTokens).values({ tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + 72 * 3600_000) });
  const link = appUrl(`/reinitialiser/${token}`);
  await sendEmail({
    to: email,
    subject: "Invitation à l'administration de la boutique Aune",
    text: `Bonjour${firstName ? ` ${firstName}` : ""},\n\nVous avez été invité·e à rejoindre l'administration de la boutique avec le rôle « ${roleLabels[role]} ».\n${existing ? "Votre compte client existant a reçu ce rôle. " : ""}Choisissez votre mot de passe (lien valable 72 heures) :\n${link}\n\nConnexion ensuite sur ${appUrl("/admin/connexion")}`,
  });
  await audit({ userId: admin.id, action: "team.invite", entityType: "user", entityId: userId, data: { email, role } });
  revalidatePath("/admin/equipe");
  // Sans SMTP (développement), le lien est montré une fois à l'administrateur.
  return { ok: true, message: process.env.SMTP_HOST ? "Invitation envoyée." : `Invitation créée. SMTP non configuré : transmettez ce lien à la personne : ${link}` };
}

export async function updateMember(_: ActionResult, form: FormData): Promise<ActionResult> {
  const admin = await requirePermission("team.manage");
  const id = String(form.get("id"));
  const member = z.string().uuid().safeParse(id).success ? await db.query.users.findFirst({ where: eq(schema.users.id, id) }) : null;
  if (!member || member.role === "customer") return { error: "Membre introuvable." };
  const op = String(form.get("op"));
  if (member.id === admin.id && op !== "role") return { error: "Vous ne pouvez pas vous désactiver vous-même." };

  if (op === "role") {
    const role = z.enum([...staffRoles, "customer"]).safeParse(form.get("role"));
    if (!role.success) return { error: "Rôle invalide." };
    if (member.id === admin.id && role.data !== "super_admin") return { error: "Vous ne pouvez pas retirer votre propre rôle de super administrateur." };
    if (member.role === "super_admin" && role.data !== "super_admin" && (await otherActiveSuperAdmins(member.id)) === 0) return { error: "Il doit rester au moins un super administrateur actif." };
    await db.update(schema.users).set({ role: role.data as Role }).where(eq(schema.users.id, id));
    await destroyAllSessions(id);
    await audit({ userId: admin.id, action: "team.role", entityType: "user", entityId: id, data: { from: member.role, to: role.data } });
    revalidatePath("/admin/equipe");
    return { ok: true, message: role.data === "customer" ? "Accès à l'administration retiré." : "Rôle modifié (la personne doit se reconnecter)." };
  }
  if (op === "deactivate" || op === "activate") {
    if (op === "deactivate" && member.role === "super_admin" && (await otherActiveSuperAdmins(member.id)) === 0) return { error: "Il doit rester au moins un super administrateur actif." };
    await db.update(schema.users).set({ isActive: op === "activate" }).where(eq(schema.users.id, id));
    if (op === "deactivate") await destroyAllSessions(id);
    await audit({ userId: admin.id, action: `team.${op}`, entityType: "user", entityId: id });
    revalidatePath("/admin/equipe");
    return { ok: true, message: op === "activate" ? "Compte réactivé." : "Compte désactivé et déconnecté." };
  }
  if (op === "logout") {
    await destroyAllSessions(id);
    await audit({ userId: admin.id, action: "team.logout", entityType: "user", entityId: id });
    return { ok: true, message: "Toutes les sessions de ce membre ont été fermées." };
  }
  return { error: "Action inconnue." };
}
