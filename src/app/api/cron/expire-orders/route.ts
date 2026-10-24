import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { expireStaleOrders } from "@/lib/orders";

/** À appeler toutes les 15 min par un planificateur (Vercel Cron, cron système…) avec l'en-tête Authorization: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret)))
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const count = await expireStaleOrders();
  return NextResponse.json({ expired: count });
}
