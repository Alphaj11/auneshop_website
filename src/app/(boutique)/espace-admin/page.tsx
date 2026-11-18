import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { VITRINE } from "@/lib/site-mode";

export const metadata: Metadata = { title: "Espace administrateur", robots: { index: false } };

const MODULES: { icon: string; title: string; text: string }[] = [
  { icon: "◎", title: "Tableau de bord", text: "Ventes du jour, commandes à préparer, stocks bas, en un coup d'œil." },
  { icon: "▤", title: "Commandes", text: "Suivi, expédition, remboursement, export CSV, notes internes." },
  { icon: "◇", title: "Produits", text: "Fiches, photos, tailles et coloris, précommande, pièces d'exemple." },
  { icon: "◌", title: "Collections", text: "Capsules, mode immersif ou grille, couverture et couleur d'accent." },
  { icon: "▥", title: "Stocks", text: "Quantités par variante, mouvements, alertes de stock bas." },
  { icon: "◉", title: "Clients", text: "Fiches clients, historique d'achats, export des données (RGPD)." },
  { icon: "%", title: "Réductions", text: "Codes promotionnels, montants ou pourcentages, limites d'usage." },
  { icon: "▦", title: "Page d'accueil", text: "Sections, textes et visuels, avec brouillon et aperçu avant publication." },
  { icon: "∿", title: "Animations", text: "Intro au fil, défilés immersifs, vitesse, réglages pour mobile." },
  { icon: "✉", title: "Messages", text: "Questions des clients, réponses par email, inscrits à la newsletter." },
  { icon: "⚙", title: "Réglages", text: "Boutique, livraison, paiement, mentions légales, réseaux sociaux." },
  { icon: "◈", title: "Équipe et rôles", text: "Comptes de l'équipe et droits par rôle, vérifiés côté serveur." },
  { icon: "≡", title: "Journal d'audit", text: "Qui a fait quoi, et quand : chaque action sensible est tracée." },
];

/**
 * Vitrine statique : présentation de l'espace administrateur, qui demande un serveur et une
 * base de données. Sur le site complet, cette adresse mène directement à l'administration.
 */
export default function AdminShowcasePage() {
  if (!VITRINE) redirect("/admin");
  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-20 pt-28 md:px-10 md:pt-32">
      <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow">Espace administrateur</p>
          <h1 className="display-lg mt-3">
            Toute la boutique se gère <em>d&apos;ici.</em>
          </h1>
          <p className="mt-5 max-w-xl text-ink-soft">
            Produits, collections, commandes, contenus, animations : l&apos;équipe Aune pilote le site depuis un espace
            réservé, protégé par mot de passe et par des rôles. Il ouvrira avec la version hébergée de la boutique, reliée
            à sa base de données.
          </p>
        </div>

        <form aria-labelledby="admin-connexion" className="rounded-[4px] border border-line bg-paper/80 p-6 shadow-[0_30px_60px_-40px_rgba(62,8,18,.5)]">
          <h2 id="admin-connexion" className="font-display text-2xl">Connexion</h2>
          <fieldset disabled className="mt-5 space-y-4 opacity-70">
            <div>
              <label htmlFor="admin-email" className="mb-1 block text-xs uppercase tracking-[0.12em] text-ink-soft">Email</label>
              <input id="admin-email" type="email" className="field" placeholder="vous@auneshop.fr" />
            </div>
            <div>
              <label htmlFor="admin-mdp" className="mb-1 block text-xs uppercase tracking-[0.12em] text-ink-soft">Mot de passe</label>
              <input id="admin-mdp" type="password" className="field" placeholder="••••••••••" />
            </div>
            <button type="button" className="btn btn-primary w-full">Se connecter</button>
          </fieldset>
          <p role="note" className="mt-4 rounded-[3px] bg-paper-2 px-4 py-3 text-sm text-ink-soft">
            Version de démonstration — la connexion sera ouverte sur la boutique hébergée.
          </p>
        </form>
      </div>

      <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((m, i) => (
          <Reveal key={m.title} as="li" delay={(i % 4) * 0.05} className="h-full rounded-[4px] border border-line p-5">
              <span aria-hidden className="font-display text-2xl text-terre-ink">{m.icon}</span>
              <h3 className="mt-3 text-sm font-medium uppercase tracking-[0.12em]">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{m.text}</p>
          </Reveal>
        ))}
        <Reveal as="li" delay={0.15} className="relative overflow-hidden rounded-[4px] bg-[#05070d] p-6 text-[#f4efe2] sm:col-span-2 lg:col-span-3">
            <span aria-hidden className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-[#fbf6e9] to-[#c8bfa6] opacity-90 shadow-[0_0_80px_30px_rgba(243,234,210,.25)]" />
            <p className="relative text-xs uppercase tracking-[0.3em] text-white/60">Qamar · قمر</p>
            <h3 className="relative mt-2 font-display text-3xl">Un mot pour les concepteurs du site</h3>
            <p className="relative mt-2 max-w-lg text-sm text-white/75">
              Demandes, améliorations, problèmes : l&apos;équipe écrit aux concepteurs avec captures d&apos;écran, suit
              l&apos;avancement (nouveau, en cours, résolu) et échange dans un fil, sous une pleine lune.
            </p>
        </Reveal>
      </ul>
    </div>
  );
}
