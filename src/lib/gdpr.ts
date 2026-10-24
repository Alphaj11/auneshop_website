import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashPassword } from "./auth/password";
import { destroyAllSessions } from "./auth/session";
import { randomToken } from "./auth/tokens";

/**
 * Anonymise un compte client (droit à l'effacement).
 * Les commandes sont conservées pour les obligations comptables mais détachées du compte ;
 * adresses, favoris, profil et inscription newsletter sont supprimés.
 */
export async function anonymizeUser(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) return null;
  await db.transaction(async (tx) => {
    await tx.delete(schema.addresses).where(eq(schema.addresses.userId, userId));
    await tx.delete(schema.wishlistItems).where(eq(schema.wishlistItems.userId, userId));
    await tx.delete(schema.customerProfiles).where(eq(schema.customerProfiles.userId, userId));
    await tx.delete(schema.newsletterSubscribers).where(sql`lower(${schema.newsletterSubscribers.email}) = lower(${user.email})`);
    await tx.update(schema.orders).set({ userId: null }).where(eq(schema.orders.userId, userId));
    await tx.update(schema.inquiries).set({ userId: null }).where(eq(schema.inquiries.userId, userId));
    await tx
      .update(schema.users)
      .set({
        email: `supprime-${userId}@anonymise.invalid`,
        firstName: "",
        lastName: "",
        isActive: false,
        anonymizedAt: new Date(),
        passwordHash: await hashPassword(randomToken()),
      })
      .where(eq(schema.users.id, userId));
  });
  await destroyAllSessions(userId);
  return user;
}

/** Export des données personnelles d'un client (droit d'accès / portabilité). */
export async function exportUserData(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { passwordHash: false },
  });
  if (!user) return null;
  const [profile, addresses, orders, wishlist, inquiries, newsletter] = await Promise.all([
    db.query.customerProfiles.findFirst({ where: eq(schema.customerProfiles.userId, userId) }),
    db.query.addresses.findMany({ where: eq(schema.addresses.userId, userId) }),
    db.query.orders.findMany({ where: eq(schema.orders.userId, userId), with: { items: true, shipments: true } }),
    db.query.wishlistItems.findMany({ where: eq(schema.wishlistItems.userId, userId) }),
    db.query.inquiries.findMany({ where: eq(schema.inquiries.userId, userId) }),
    db.query.newsletterSubscribers.findFirst({ where: sql`lower(${schema.newsletterSubscribers.email}) = lower(${user.email})`, columns: { unsubscribeToken: false } }),
  ]);
  return { exportedAt: new Date().toISOString(), user, profile, addresses, orders, wishlist, inquiries, newsletter };
}
