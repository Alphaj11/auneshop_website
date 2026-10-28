"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BackButton } from "./BackButton";
import { useCart } from "./CartProvider";
import { BagIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./Icons";

type NavCollection = { slug: string; name: string; tagline: string; coverImageUrl: string | null };

export function Header({
  storeName,
  collections,
  signedIn,
  isStaff,
}: {
  storeName: string;
  collections: NavCollection[];
  signedIn: boolean;
  isStaff: boolean;
}) {
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const { cart, setOpen, lastAddedAt } = useCart();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Ferme les menus à chaque changement de page.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMega(false);
    setMobile(false);
    setSearch(false);
  }

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
  }, [mobile]);

  const solid = scrolled || !overHero || mega || search;

  return (
    <>
      <a href="#contenu" className="sr-only z-[90] rounded bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Aller au contenu
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background,color,box-shadow] duration-500 ${
          solid ? "bg-paper/90 text-ink shadow-[0_1px_0_var(--line)] backdrop-blur-md" : "bg-transparent text-ink"
        }`}
        onMouseLeave={() => setMega(false)}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 md:h-20 md:px-10">
          <div className="flex flex-1 items-center gap-1 lg:gap-3 xl:gap-8">
            {/* Sous 1280 px, toute la navigation passe dans le menu. */}
            <button className="-ml-2 p-2 xl:hidden" aria-label="Ouvrir le menu" aria-expanded={mobile} onClick={() => setMobile(true)}>
              <MenuIcon />
            </button>
            <BackButton />
            <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-[0.8rem] uppercase tracking-[0.16em] xl:flex">
              <button
                className="link-underline uppercase"
                aria-expanded={mega}
                aria-controls="mega-collections"
                onClick={() => setMega((m) => !m)}
                onMouseEnter={() => setMega(true)}
              >
                Collections
              </button>
              <Link href="/boutique?rayon=femme" className="link-underline" onMouseEnter={() => setMega(false)}>
                Femme
              </Link>
              <Link href="/boutique?rayon=homme" className="link-underline" onMouseEnter={() => setMega(false)}>
                Homme
              </Link>
              <Link href="/atelier" className="link-underline" onMouseEnter={() => setMega(false)}>
                L&apos;atelier
              </Link>
            </nav>
          </div>

          <Link href="/" className="block" aria-label={`${storeName}, accueil`}>
            <Logo className="h-6 w-auto sm:h-7 md:h-9" />
          </Link>

          <div className="flex flex-1 items-center justify-end gap-1 md:gap-3">
            <nav aria-label="La maison" className="mr-4 hidden items-center gap-7 text-[0.8rem] uppercase tracking-[0.16em] xl:flex">
              <Link href="/le-projet" className="link-underline">
                Le projet
              </Link>
              <Link href="/contact" className="link-underline">
                Contact
              </Link>
            </nav>
            {isStaff && (
              <Link href="/admin" className="hidden rounded-full border border-current px-3 py-1 text-xs uppercase tracking-widest 2xl:inline-block">
                Admin
              </Link>
            )}
            <button className="p-2" aria-label="Rechercher" aria-expanded={search} onClick={() => setSearch((s) => !s)}>
              <SearchIcon />
            </button>
            <Link href={signedIn ? "/compte/favoris" : "/connexion?suivant=/compte/favoris"} className="hidden p-2 sm:block" aria-label="Favoris">
              <HeartIcon />
            </Link>
            <Link href={signedIn ? "/compte" : "/connexion"} className="p-2" aria-label={signedIn ? "Mon compte" : "Se connecter"}>
              <UserIcon />
            </Link>
            <button className="relative -mr-2 p-2" aria-label={`Ouvrir le panier, ${cart.count} article(s)`} onClick={() => setOpen(true)}>
              <motion.span key={lastAddedAt} initial={lastAddedAt ? { rotate: -12, scale: 1.2 } : false} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 12 }} className="block">
                <BagIcon />
              </motion.span>
              {cart.count > 0 && (
                <motion.span
                  key={`c${cart.count}`}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-terre px-1 text-[10px] font-medium text-paper"
                >
                  {cart.count}
                </motion.span>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {search && (
            <motion.form
              action="/recherche"
              role="search"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-line bg-paper"
            >
              <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
                <label htmlFor="q" className="sr-only">
                  Rechercher un produit
                </label>
                <input id="q" name="q" autoFocus className="field" placeholder="Une robe, une couleur, une matière…" />
                <button className="btn btn-primary">Chercher</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mega && (
            <motion.div
              id="mega-collections"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-full hidden border-t border-line bg-paper xl:block"
            >
              <div className="mx-auto grid max-w-[1600px] grid-cols-5 gap-6 px-10 py-8">
                {collections.slice(0, 4).map((c, i) => (
                  <motion.div key={c.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                    <Link href={`/collections/${c.slug}`} className="group block">
                      <div className="relative aspect-[6/5] overflow-hidden rounded bg-paper-2">
                        {c.coverImageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.coverImageUrl} alt="" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-cloth)] group-hover:scale-105" />
                        )}
                      </div>
                      <p className="mt-3 font-display text-lg">{c.name}</p>
                      <p className="text-xs text-ink-soft">{c.tagline}</p>
                    </Link>
                  </motion.div>
                ))}
                <div className="flex flex-col justify-end gap-3 border-l border-line pl-6 text-sm">
                  <Link href="/collections" className="link-underline w-fit">Toutes les collections</Link>
                  <Link href="/boutique" className="link-underline w-fit">Toute la boutique</Link>
                  <Link href="/boutique?nouveautes=1" className="link-underline w-fit">Nouveautés</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {mobile && (
          <motion.div
            className="fixed inset-0 z-[75] flex flex-col bg-paper px-6 pb-8"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            onKeyDown={(e) => e.key === "Escape" && setMobile(false)}
          >
            <div className="flex h-16 items-center justify-between">
              <Logo className="h-7 w-auto" alt={storeName} />
              <button className="-mr-2 p-2" onClick={() => setMobile(false)} aria-label="Fermer le menu" autoFocus>
                <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden>
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-1" aria-label="Menu mobile">
              {[
                ["/collections", "Collections"],
                ["/boutique?rayon=femme", "Femme"],
                ["/boutique?rayon=homme", "Homme"],
                ["/boutique?nouveautes=1", "Nouveautés"],
                ["/atelier", "L'atelier"],
                ["/le-projet", "Le projet"],
                ["/contact", "Contact"],
                [signedIn ? "/compte" : "/connexion", signedIn ? "Mon compte" : "Se connecter"],
              ].map(([href, label], i) => (
                <motion.div key={href} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05, duration: 0.5 }}>
                  <Link href={href} className="block py-2 font-display text-4xl">
                    {label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto grid grid-cols-2 gap-3">
              {collections.slice(0, 2).map((c) => (
                <Link key={c.slug} href={`/collections/${c.slug}`} className="block">
                  <div className="relative aspect-square overflow-hidden rounded bg-paper-2">
                    {c.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.coverImageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <p className="mt-2 text-sm">{c.name}</p>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
