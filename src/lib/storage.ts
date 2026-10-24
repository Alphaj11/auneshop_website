import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "./auth/tokens";

/**
 * Stockage des images.
 * - STORAGE_DRIVER=local (défaut) : fichiers dans UPLOAD_DIR, servis par /media/...
 * - STORAGE_DRIVER=s3 : tout service compatible S3 (AWS, Scaleway, Cloudflare R2, OVH…)
 */

const MAX_BYTES = 8 * 1024 * 1024;

const signatures: { type: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { type: "image/avif", ext: "avif", test: (b) => b.subarray(4, 12).toString() === "ftypavif" },
];

export class UploadError extends Error {}

export function uploadDir() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR ?? "storage/uploads");
}

export async function saveImage(file: File, folder = "products"): Promise<string> {
  if (file.size === 0) throw new UploadError("Fichier vide.");
  if (file.size > MAX_BYTES) throw new UploadError("Image trop lourde (8 Mo maximum).");
  const buffer = Buffer.from(await file.arrayBuffer());
  // Le type est déterminé par le contenu réel du fichier, pas par son nom (SVG refusés : risque XSS).
  const sig = signatures.find((s) => s.test(buffer));
  if (!sig) throw new UploadError("Format non pris en charge (JPEG, PNG, WebP ou AVIF).");
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "");
  const key = `${safeFolder}/${new Date().toISOString().slice(0, 7)}/${randomToken(12)}.${sig.ext}`;

  if (process.env.STORAGE_DRIVER === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = s3Client(S3Client);
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: sig.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${process.env.S3_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  }

  const target = path.join(uploadDir(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return `/media/${key}`;
}

/** Supprime un fichier téléversé (ignore les images de démonstration de /public). */
export async function deleteImage(url: string) {
  try {
    if (url.startsWith("/media/")) {
      const rel = url.slice("/media/".length);
      const target = path.resolve(uploadDir(), rel);
      if (!target.startsWith(uploadDir())) return;
      await unlink(target);
    } else if (process.env.STORAGE_DRIVER === "s3" && process.env.S3_PUBLIC_URL && url.startsWith(process.env.S3_PUBLIC_URL)) {
      const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const key = url.slice(process.env.S3_PUBLIC_URL.replace(/\/$/, "").length + 1);
      await s3Client(S3Client).send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
    }
  } catch (e) {
    console.warn("[storage] suppression impossible", url, e);
  }
}

function s3Client(S3Client: typeof import("@aws-sdk/client-s3").S3Client) {
  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}
