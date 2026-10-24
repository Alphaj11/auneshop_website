import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";
import { can, type Permission } from "./permissions";

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
