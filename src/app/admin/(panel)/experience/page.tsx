import { SettingsSection } from "@/components/admin/SettingsSection";
import { PageHeader, btnSm } from "@/components/admin/ui";
import { requireStaffPage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Animations et expérience" };

export default async function ExperienceAdmin() {
  await requireStaffPage("content.manage");
  const s = await getSettings();
  return (
    <>
      <PageHeader
        title="Animations et expérience"
        description="L'introduction n'est jouée qu'une fois par visiteur (et par version). Elle est toujours ignorable et désactivée si le visiteur a demandé à réduire les animations."
        actions={<a href="/?intro=1" target="_blank" className={btnSm}>Voir l&apos;introduction ↗</a>}
      />
      <div className="space-y-6">
        <SettingsSection
          section="intro"
          title="Introduction « Le vêtement prend vie »"
          values={s.intro}
          fields={[
            { key: "enabled", label: "Activer l'introduction", type: "checkbox" },
            { key: "line1", label: "Première phrase" },
            { key: "line2", label: "Seconde phrase" },
            {
              key: "mobileMode",
              label: "Sur mobile et appareils peu puissants",
              type: "select",
              options: [["full", "Animation complète"], ["light", "Version allégée (recommandé)"], ["off", "Aucune introduction"]],
            },
            {
              key: "garmentImageUrl",
              label: "Visuel du vêtement final (facultatif)",
              type: "image",
              hint: "Image détourée (PNG ou WebP transparent). Sans image, une silhouette de robe dessinée est utilisée.",
            },
          ]}
          extra={
            <label className="flex items-start gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="replay" className="mt-0.5 h-4 w-4" />
              <span>
                Rejouer l&apos;introduction pour tous les visiteurs <span className="block text-xs text-ink-mute">Version actuelle : {s.intro.version}. À cocher après une modification importante.</span>
              </span>
            </label>
          }
        />
        <SettingsSection
          section="experience"
          title="Collections immersives et effets"
          values={s.experience}
          fields={[
            { key: "orbitEnabled", label: "Activer la scène orbitale dans les collections", type: "checkbox", hint: "Désactivé : toutes les collections s'affichent en grille." },
            { key: "mobileDefault", label: "Vue par défaut sur mobile", type: "select", options: [["immersive", "Scène immersive"], ["grid", "Grille"]] },
            { key: "orbitSpeed", label: "Vitesse de rotation automatique (0 = immobile, 1 = normale, 3 = rapide)", type: "number", step: "0.1" },
            { key: "pageTransitions", label: "Transitions entre les pages", type: "checkbox" },
            { key: "scrollReveals", label: "Apparition des contenus au défilement", type: "checkbox" },
            { key: "hoverEffects", label: "Effets au survol (cartes produit, collections)", type: "checkbox" },
          ]}
        />
      </div>
    </>
  );
}
