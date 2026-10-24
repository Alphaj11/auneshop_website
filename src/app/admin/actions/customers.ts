"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { destroyAllSessions } from "@/lib/auth/session";
import { anonymizeUser } from "@/lib/gdpr";
import type { ActionResult } from "@/components/admin/ActionForm";

async function loadCustomer(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  // Les comptes d'équipe se gèrent dans « Équipe et rôles ».
  return u && u.role === "customer" ? u : null;
}

export async function setCustomerActive(_: ActionResult, form: FormData): Promise<ActionResult> {
  const admin = await requirePermission("customers.manage");
  const user = await loadCustomer(String(form.get("id")));
  if (!user) return { error: "Client introuvable." };
  if (user.anonymizedAt) return { error: "Compte anonymisé." };
  const active = form.get("active") === "1";
  await db.update(schema.users).set({ isActive: active }).where(eq(schema.users.id, user.id));
  if (!active) await destroyAllSessions(user.id);
  await audit({ userId: admin.id, action: active ? "customer.reactivate" : "customer.deactivate", entityType: "user", entityId: user.id });
  revalidatePath(`/admin/clients/${user.id}`);
  return { ok: true, message: active ? "Compte réactivé." : "Compte désactivé : le client ne peut plus se connecter." };
}

export async function anonymizeCustomer(_: ActionResult, form: FormData): Promise<ActionResult> {
  const admin = await requirePermission("customers.manage");
  const user = await loadCustomer(String(form.get("id")));
  if (!user) return { error: "Client introuvable." };
  if (user.anonymizedAt) return { error: "Déjà anonymisé." };
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== user.email.toLowerCase()) return { error: "Recopiez l'email du client pour confirmer." };
  await anonymizeUser(user.id);
  await audit({ userId: admin.id, action: "customer.anonymize", entityType: "user", entityId: user.id });
  revalidatePath(`/admin/clients/${user.id}`);
  return { ok: true, message: "Données personnelles effacées. Les commandes sont conservées, détachées du compte." };
}
