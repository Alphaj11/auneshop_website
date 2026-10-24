/**
 * Crée (ou promeut) un compte administrateur de manière sécurisée.
 *
 *   npm run admin:create -- --email vous@domaine.fr [--role super_admin]
 *
 * Le mot de passe est demandé de façon interactive (jamais en argument, pour
 * ne pas le laisser dans l'historique du terminal). En environnement non
 * interactif (CI), il peut être fourni via la variable ADMIN_PASSWORD.
 */
import { createInterface } from "node:readline/promises";
import { hash } from "@node-rs/argon2";
import { sql } from "drizzle-orm";
import { scriptDb } from "./db";

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const roles = ["super_admin", "store_manager", "order_manager"] as const;

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const role = (arg("role") ?? "super_admin") as (typeof roles)[number];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Indiquez --email valide.");
  if (!roles.includes(role)) throw new Error(`Rôle invalide. Valeurs : ${roles.join(", ")}`);

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Mot de passe (12 caractères minimum) : ");
    const confirm = await rl.question("Confirmez le mot de passe : ");
    rl.close();
    if (password !== confirm) throw new Error("Les mots de passe ne correspondent pas.");
  }
  if (password.length < 12) throw new Error("Mot de passe trop court (12 caractères minimum).");

  const { db, close, schema } = scriptDb();
  const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });
  const existing = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${email}`);
  if (existing[0]) {
    await db
      .update(schema.users)
      .set({ role, passwordHash, isActive: true })
      .where(sql`${schema.users.id} = ${existing[0].id}`);
    await db.delete(schema.sessions).where(sql`${schema.sessions.userId} = ${existing[0].id}`);
    console.log(`Compte existant mis à jour : ${email} (${role}).`);
  } else {
    const [u] = await db.insert(schema.users).values({ email, passwordHash, role }).returning();
    await db.insert(schema.customerProfiles).values({ userId: u.id });
    console.log(`Compte administrateur créé : ${email} (${role}).`);
  }
  await db.insert(schema.auditLogs).values({ action: "admin.create_cli", entityType: "user", data: { email, role } });
  await close();
}

main().catch((e) => {
  console.error("Erreur :", e.message);
  process.exit(1);
});
