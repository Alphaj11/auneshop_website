import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { csvResponse } from "@/lib/csv";

/** Export des inscrits (pour import dans un outil d'emailing), avec la preuve du consentement. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "customers.manage")) return new Response("Accès refusé", { status: 403 });
  const rows = await db.query.newsletterSubscribers.findMany({ orderBy: [desc(schema.newsletterSubscribers.createdAt)] });
  await audit({ userId: user.id, action: "newsletter.export", entityType: "newsletter", data: { count: rows.length } });
  return csvResponse(
    `newsletter-${new Date().toISOString().slice(0, 10)}.csv`,
    ["email", "statut", "date_consentement", "texte_consentement", "source", "date_desinscription"],
    rows.map((r) => [r.email, r.status, r.consentAt.toISOString(), r.consentText, r.source, r.unsubscribedAt?.toISOString() ?? ""]),
  );
}
