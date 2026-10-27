import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "@fontsource-variable/inter/index.css";
import "./globals.css";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: s.seo.defaultTitle, template: s.seo.titleTemplate },
    description: s.seo.defaultDescription,
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: s.store.name,
      images: s.seo.ogImageUrl ? [s.seo.ogImageUrl] : undefined,
    },
  };
}

export const viewport: Viewport = { themeColor: "#cbcfb8", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const motion = (await cookies()).get("aune_motion")?.value === "off" ? "off" : "on";
  return (
    // suppressHydrationWarning : data-intro-vue est posé volontairement avant l'hydratation (IntroGate).
    <html lang="fr" data-motion={motion} suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/outfit.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
