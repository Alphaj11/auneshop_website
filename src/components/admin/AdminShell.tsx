"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Permission } from "@/lib/auth/permissions";

const nav: { href: string; label: string; perm: Permission; icon: string }[] = [
  { href: "/admin", label: "Tableau de bord", perm: "dashboard.view", icon: "◎" },
  { href: "/admin/commandes", label: "Commandes", perm: "orders.view", icon: "▤" },
  { href: "/admin/produits", label: "Produits", perm: "products.manage", icon: "◇" },
  { href: "/admin/collections", label: "Collections", perm: "collections.manage", icon: "◌" },
  { href: "/admin/stocks", label: "Stocks", perm: "inventory.manage", icon: "▥" },
  { href: "/admin/clients", label: "Clients", perm: "customers.view", icon: "◉" },
  { href: "/admin/reductions", label: "Réductions", perm: "products.manage", icon: "%" },
  { href: "/admin/accueil", label: "Page d'accueil", perm: "content.manage", icon: "▦" },
  { href: "/admin/experience", label: "Animations", perm: "content.manage", icon: "∿" },
  { href: "/admin/messages", label: "Messages", perm: "orders.view", icon: "✉" },
  { href: "/admin/reglages", label: "Réglages", perm: "settings.manage", icon: "⚙" },
  { href: "/admin/equipe", label: "Équipe et rôles", perm: "team.manage", icon: "◈" },
  { href: "/admin/journal", label: "Journal d'audit", perm: "audit.view", icon: "≡" },
];

export function AdminShell({
  children,
  allowed,
  user,
  roleLabel,
  logout,
  paymentMode,
}: {
  children: React.ReactNode;
  allowed: Permission[];
  user: { email: string; name: string };
  roleLabel: string;
  logout: () => Promise<void>;
  paymentMode: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = nav.filter((n) => allowed.includes(n.perm));
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="px-6 py-6 font-display text-2xl tracking-[0.3em]">
        AUNE <span className="ml-1 align-middle font-sans text-[10px] tracking-[0.2em] text-paper/50">ADMIN</span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3" aria-label="Administration">
        <ul className="space-y-0.5">
          {items.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors ${isActive(n.href) ? "bg-paper/12 text-paper" : "text-paper/70 hover:bg-paper/6 hover:text-paper"}`}
              >
                <span className="w-4 text-center opacity-70" aria-hidden>{n.icon}</span>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-paper/10 p-4 text-xs text-paper/60">
        <p className="truncate text-paper/90">{user.name || user.email}</p>
        <p>{roleLabel}</p>
        <div className="mt-3 flex gap-3">
          <Link href="/" className="underline">Voir le site</Link>
          <form action={logout}><button className="underline">Déconnexion</button></form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#f7f4ef] text-ink lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh bg-ink text-paper lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu d'administration">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink text-paper">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-line bg-[#f7f4ef]/90 px-4 backdrop-blur md:px-8">
          <button className="rounded border border-line px-3 py-1.5 text-sm lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            Menu
          </button>
          <form action="/admin/recherche" className="flex-1" role="search">
            <label htmlFor="admin-q" className="sr-only">Rechercher</label>
            <input id="admin-q" name="q" placeholder="Rechercher une commande, un produit, un client…" className="w-full max-w-md rounded-full border border-line bg-white/70 px-4 py-1.5 text-sm focus:border-ink focus:outline-none" />
          </form>
          <span className={`hidden rounded-full px-3 py-1 text-xs sm:inline-block ${paymentMode === "stripe_live" ? "bg-success/15 text-success" : "bg-terre/15 text-terre-ink"}`}>
            Paiement : {paymentMode === "demo" ? "démonstration" : paymentMode === "stripe_test" ? "Stripe test" : "Stripe réel"}
          </span>
        </header>
        <main id="contenu" className="px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
