import "server-only";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { parsePriceToCents } from "@/lib/money";

export type OrderFilters = { q?: string; statut?: string; paiement?: string; du?: string; au?: string; min?: string; max?: string; tests?: string; page?: string };

export function orderWhere(f: OrderFilters) {
  const conds: (SQL | undefined)[] = [];
  if (f.q) {
    const q = `%${f.q.trim().replace(/[%_\\]/g, (c) => "\\" + c)}%`;
    conds.push(or(ilike(schema.orders.number, q), ilike(schema.orders.email, q), sql`(${schema.orders.shippingAddress}->>'lastName') ilike ${q}`));
  }
  if (f.statut) conds.push(eq(schema.orders.status, f.statut as never));
  if (f.paiement) conds.push(eq(schema.orders.paymentStatus, f.paiement as never));
  if (f.du && /^\d{4}-\d{2}-\d{2}$/.test(f.du)) conds.push(gte(schema.orders.createdAt, new Date(`${f.du}T00:00:00`)));
  if (f.au && /^\d{4}-\d{2}-\d{2}$/.test(f.au)) conds.push(lte(schema.orders.createdAt, new Date(`${f.au}T23:59:59`)));
  const min = f.min ? parsePriceToCents(f.min) : null;
  const max = f.max ? parsePriceToCents(f.max) : null;
  if (min !== null) conds.push(gte(schema.orders.totalCents, min));
  if (max !== null) conds.push(lte(schema.orders.totalCents, max));
  if (f.tests === "exclure") conds.push(eq(schema.orders.isTest, false));
  if (f.tests === "seulement") conds.push(eq(schema.orders.isTest, true));
  return and(...conds);
}

export async function findOrders(f: OrderFilters, limit = 30) {
  const page = Math.max(1, Number(f.page) || 1);
  const where = orderWhere(f);
  const [rows, total] = await Promise.all([
    db.query.orders.findMany({ where, orderBy: [desc(schema.orders.createdAt)], limit, offset: (page - 1) * limit, with: { items: { columns: { quantity: true } } } }),
    db.$count(schema.orders, where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
