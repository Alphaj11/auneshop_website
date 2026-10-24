import { cookies } from "next/headers";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { CartProvider } from "@/components/shop/CartProvider";
import { Footer } from "@/components/shop/Footer";
import { Header } from "@/components/shop/Header";
import { IntroGate } from "@/components/immersive/IntroGate";
import { MotionPrefProvider } from "@/components/ui/MotionPref";
import { ToastProvider } from "@/components/ui/Toaster";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/permissions";
import { getCartView } from "@/lib/cart";
import { listCollections } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, user, cart, collections, jar] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    getCartView(),
    listCollections(),
    cookies(),
  ]);
  const introSeen = jar.get("aune_intro")?.value === String(settings.intro.version);
  return (
    <MotionPrefProvider initialOff={jar.get("aune_motion")?.value === "off"} features={settings.experience}>
      <ToastProvider>
        <CartProvider initial={cart}>
          <div className="paper-grain">
            {settings.intro.enabled && !introSeen && (
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
              signedIn={!!user}
              isStaff={isStaff(user?.role)}
            />
            <main id="contenu">{children}</main>
            <Footer settings={settings} />
            <CartDrawer />
          </div>
        </CartProvider>
      </ToastProvider>
    </MotionPrefProvider>
  );
}
