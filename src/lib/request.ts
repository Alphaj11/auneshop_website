import "server-only";
import { headers } from "next/headers";

/** IP du client (derrière un proxy de confiance comme Vercel ou Nginx). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "local";
}
