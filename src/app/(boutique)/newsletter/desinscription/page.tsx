import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const metadata: Metadata = { title: "Désinscription", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let ok = false;
  if (token && token.length < 100) {
    const rows = await db
      .update(schema.newsletterSubscribers)
      .set({ status: "unsubscribed", unsubscribedAt: new Date() })
      .where(eq(schema.newsletterSubscribers.unsubscribeToken, token))
      .returning();
    ok = rows.length > 0;
  }
  return (
    <div className="mx-auto max-w-xl px-5 pb-10 pt-40 text-center">
      <h1 className="display-lg">{ok ? "Vous êtes désinscrit·e." : "Lien invalide"}</h1>
      <p className="mt-4 text-ink-soft">{ok ? "Vous ne recevrez plus la newsletter." : "Ce lien de désinscription n'est pas reconnu. Écrivez-nous si besoin."}</p>
    </div>
  );
}
