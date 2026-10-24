import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [products, collections] = await Promise.all([
    db.select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt }).from(schema.products).where(eq(schema.products.status, "active")),
    db.select({ slug: schema.collections.slug, updatedAt: schema.collections.updatedAt }).from(schema.collections).where(eq(schema.collections.status, "published")),
  ]);
  const statics = ["", "/collections", "/boutique", "/atelier", "/faq", "/contact", "/livraison-retours", "/cgv", "/mentions-legales", "/confidentialite"];
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 })),
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, lastModified: c.updatedAt, priority: 0.8 })),
    ...products.map((p) => ({ url: `${base}/produits/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
  ];
}
