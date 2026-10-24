import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import type { StoreSettings } from "@/lib/settings-schema";
import { MotionToggle } from "./MotionToggle";

export function Footer({ settings }: { settings: StoreSettings }) {
  const social = Object.entries({
    Instagram: settings.social.instagram,
    Facebook: settings.social.facebook,
    TikTok: settings.social.tiktok,
    Pinterest: settings.social.pinterest,
  });
  return (
    <footer className="mt-32 bg-ink text-paper">
      <div className="mx-auto max-w-[1600px] px-5 pt-20 md:px-10">
        <div className="grid gap-14 border-b border-paper/15 pb-16 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow !text-paper/60">{settings.store.name}</p>
            <p className="display-md mt-4 max-w-md">{settings.store.tagline}</p>
            <p className="mt-8 text-sm text-paper/70">
              Une question sur une pièce ou une commande ?{" "}
              <a className="link-underline text-paper" href={`mailto:${settings.store.email}`}>
                {settings.store.email}
              </a>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="eyebrow mb-4 !text-paper/60">La maison</p>
              <ul className="space-y-2.5">
                <li><Link className="link-underline" href="/atelier">À propos</Link></li>
                <li><Link className="link-underline" href="/collections">Collections</Link></li>
                <li><Link className="link-underline" href="/contact">Contact</Link></li>
                <li><Link className="link-underline" href="/faq">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-4 !text-paper/60">Aide</p>
              <ul className="space-y-2.5">
                <li><Link className="link-underline" href="/livraison-retours">Livraison et retours</Link></li>
                <li><Link className="link-underline" href="/compte/commandes">Suivre une commande</Link></li>
                <li><Link className="link-underline" href="/cgv">Conditions générales de vente</Link></li>
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-4 !text-paper/60">Suivre</p>
              <ul className="space-y-2.5">
                {social.map(([name, url]) => (
                  <li key={name}>
                    {url ? (
                      <a className="link-underline" href={url} target="_blank" rel="noopener noreferrer">
                        {name}
                      </a>
                    ) : (
                      <span className="text-paper/50" title="Lien à configurer dans l'administration">{name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div aria-hidden className="flex select-none justify-center overflow-hidden py-8 opacity-[0.12]">
          <Logo tone="blanc" className="h-auto w-[78vw] max-w-[1100px]" />
        </div>
        <div className="flex flex-col gap-5 border-t border-paper/15 py-8 text-xs text-paper/70 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className="link-underline" href="/mentions-legales">Mentions légales</Link>
            <Link className="link-underline" href="/confidentialite">Confidentialité</Link>
            <Link className="link-underline" href="/cookies">Cookies</Link>
            <Link className="link-underline" href="/cgv">CGV</Link>
          </nav>
          <MotionToggle />
          <p>© {new Date().getFullYear()} {settings.store.name}</p>
        </div>
      </div>
    </footer>
  );
}
