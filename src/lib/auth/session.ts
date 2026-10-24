import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { randomToken, sha256 } from "./tokens";
import type { Role } from "./permissions";

export const SESSION_COOKIE = "aune_session";
const SESSION_DAYS = 30;
const STAFF_SESSION_HOURS = 12;

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
};

export async function createSession(userId: string, role: Role) {
  const token = randomToken();
  const isStaff = role !== "customer";
  const ms = isStaff ? STAFF_SESSION_HOURS * 3600_000 : SESSION_DAYS * 86400_000;
  const expiresAt = new Date(Date.now() + ms);
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt, userAgent: ua });
  // Nettoyage opportuniste des sessions expirées.
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

/** Utilisateur connecté, ou null. Mis en cache pour la durée de la requête. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      role: schema.users.role,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      isActive: schema.users.isActive,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || !row.isActive) return null;
  return { id: row.id, email: row.email, role: row.role, firstName: row.firstName, lastName: row.lastName };
});
