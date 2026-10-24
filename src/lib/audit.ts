import "server-only";
import { db, schema, type Tx } from "@/db";
import { clientIp } from "./request";

export async function audit(
  entry: { userId?: string | null; action: string; entityType: string; entityId?: string | null; data?: unknown },
  tx?: Tx,
) {
  let ip: string | null = null;
  try {
    ip = await clientIp();
  } catch {
    // hors contexte de requête (script, webhook interne)
  }
  await (tx ?? db).insert(schema.auditLogs).values({
    userId: entry.userId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    data: entry.data ?? null,
    ip,
  });
}
