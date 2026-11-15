import "@fontsource-variable/inter/index.css";
import "./globals.css";
import { BASE_PATH } from "@/lib/site-mode";

export { generateMetadata, viewport } from "./layout.full";

/** Mise en page racine de la vitrine statique : sans cookie, le mouvement est actif par défaut. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-motion="on" suppressHydrationWarning>
      <head>
        <meta name="robots" content="noindex" />
        <link rel="preload" href={`${BASE_PATH}/fonts/cormorant-garamond-normal.woff2`} as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
