import { CartDrawer } from "@/components/shop/CartDrawer";
import { CartProvider } from "@/components/shop/CartProvider";
import { Footer } from "@/components/shop/Footer";
import { Header } from "@/components/shop/Header";
import { IntroGate } from "@/components/immersive/IntroGate";
import { MotionPrefProvider } from "@/components/ui/MotionPref";
import { ToastProvider } from "@/components/ui/Toaster";
import { getCartView } from "@/lib/cart";
import { listCollections } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

/** Mise en page de la vitrine statique : sans session ni cookie, avec un bandeau « Démo ». */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, cart, collections] = await Promise.all([getSettings(), getCartView(), listCollections()]);
  return (
    <MotionPrefProvider initialOff={false} features={settings.experience}>
      <ToastProvider>
        <CartProvider initial={cart}>
          <div className="paper-grain">
            {settings.intro.enabled && (
              <IntroGate
                storeName={settings.store.name}
                line1={settings.intro.line1}
                line2={settings.intro.line2}
                version={settings.intro.version}
                mobileMode={settings.intro.mobileMode}
                garmentImageUrl={settings.intro.garmentImageUrl || undefined}
              />
            )}
            <Header
              storeName={settings.store.name}
              collections={collections.map((c) => ({ slug: c.slug, name: c.name, tagline: c.tagline, coverImageUrl: c.coverImageUrl }))}
              signedIn={false}
              isStaff={false}
            />
            <main id="contenu">{children}</main>
            <Footer settings={settings} />
            <CartDrawer />
            <p className="pointer-events-none fixed bottom-3 left-3 z-[70] rounded-full bg-ink/85 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-paper shadow-sm">
              Démo
            </p>
          </div>
        </CartProvider>
      </ToastProvider>
    </MotionPrefProvider>
  );
}
