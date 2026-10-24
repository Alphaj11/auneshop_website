import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { orderWhere, type OrderFilters } from "../query";


export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "orders.export")) return new Response("Accès refusé", { status: 403 });
  const f = Object.fromEntries(new URL(req.url).searchParams) as OrderFilters;
  const rows = await db.query.orders.findMany({ where: orderWhere(f), orderBy: [desc(schema.orders.createdAt)], with: { items: true }, limit: 10000 });
  const header = ["numero", "date", "email", "prenom", "nom", "ville", "pays", "statut", "paiement", "mode_paiement", "test", "articles", "sous_total", "reduction", "livraison", "tva", "total", "code_promo"];
  const lines = rows.map((o) =>
    [
      o.number, o.createdAt.toISOString(), o.email, o.shippingAddress.firstName, o.shippingAddress.lastName, o.shippingAddress.city, o.shippingAddress.country,
      o.status, o.paymentStatus, o.paymentMode, o.isTest ? "oui" : "non",
      o.items.map((i) => `${i.quantity}x ${i.productName} (${i.variantLabel})`).join(" | "),
      (o.subtotalCents / 100).toFixed(2).replace(".", ","), (o.discountCents / 100).toFixed(2).replace(".", ","), (o.shippingCents / 100).toFixed(2).replace(".", ","),
      (o.taxCents / 100).toFixed(2).replace(".", ","), (o.totalCents / 100).toFixed(2).replace(".", ","), o.discountCode ?? "",
    ],
  );
  await audit({ userId: user.id, action: "orders.export", entityType: "order", data: { count: rows.length, filters: f } });
  return csvResponse(`commandes-${new Date().toISOString().slice(0, 10)}.csv`, header, lines);
}
