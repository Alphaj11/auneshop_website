import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";
import { exportUserData } from "@/lib/gdpr";

/** Export JSON des données d'un client (demande d'accès RGPD). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requirePermission("customers.manage");
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const data = await exportUserData(id);
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await audit({ userId: admin.id, action: "customer.export", entityType: "user", entityId: id });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="donnees-client-${id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
