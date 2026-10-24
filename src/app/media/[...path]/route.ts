import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/storage";

const types: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

/** Sert les images téléversées en stockage local (STORAGE_DRIVER=local). */
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const root = uploadDir();
  const file = path.resolve(root, ...parts);
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  if (!file.startsWith(root + path.sep) || !types[ext]) return new Response("Introuvable", { status: 404 });
  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": types[ext], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
