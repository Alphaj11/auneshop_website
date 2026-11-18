import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";
import { can, type Permission } from "./permissions";
import { VITRINE } from "@/lib/site-mode";

/**
 * Vitrine statique : l’admin est photographié en lecture seule pendant la génération, sans
 * session. Seules les PAGES sont ouvertes ; les actions serveur gardent requirePermission.
 * NEXT_PUBLIC_VITRINE ne doit jamais être activé sur un serveur public.
 */
const VITRINE_STAFF: SessionUser = { id: "00000000-0000-0000-0000-000000000000", email: "demo@aune.test", role: "super_admin", firstName: "Démo", lastName: "Aune" };

export class AuthorizationError extends Error {
  constructor() {
    super("Accès refusé");
  }
}

/** Pour les pages du compte client. */
export async function requireUser(next = "/compte"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suivant=${encodeURIComponent(next)}`);
  return user;
}

/** Pour les pages d'administration : redirige si non autorisé. */
export async function requireStaffPage(permission: Permission = "admin.access"): Promise<SessionUser> {
  if (VITRINE) return VITRINE_STAFF;
  const user = await getCurrentUser();
  if (!user) redirect("/admin/connexion");
  if (!can(user.role, "admin.access")) redirect("/");
  if (!can(user.role, permission)) redirect("/admin?refus=1");
  return user;
}

/** Pour les actions serveur : lève une erreur si non autorisé. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, permission)) throw new AuthorizationError();
  return user;
}
