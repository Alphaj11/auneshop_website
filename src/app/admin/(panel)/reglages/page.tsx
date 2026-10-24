import { Card, PageHeader } from "@/components/admin/ui";
import { SettingsSection } from "@/components/admin/SettingsSection";
import { requireStaffPage } from "@/lib/auth/guards";
import { currentPaymentMode, demoCheckoutAllowed } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Réglages" };

/** État des intégrations : on affiche seulement si une variable est définie, jamais sa valeur. */
function integrations() {
  const set = (k: string) => !!process.env[k];
  const mode = currentPaymentMode();
  return [
    {
      label: "Paiement",
      value: mode === "demo" ? (demoCheckoutAllowed() ? "Mode démonstration (aucun paiement réel)" : "Mode démonstration : commandes bloquées en production tant que Stripe n'est pas configuré") : mode === "stripe_test" ? "Stripe — mode test" : "Stripe — paiements réels",
      ok: mode !== "demo",
    },
    { label: "Clé secrète Stripe", value: set("STRIPE_SECRET_KEY") ? "Configurée côté serveur" : "Non configurée", ok: set("STRIPE_SECRET_KEY") },
    { label: "Secret de signature des webhooks Stripe", value: set("STRIPE_WEBHOOK_SECRET") ? "Configuré" : "Non configuré : les paiements ne pourront pas être confirmés", ok: set("STRIPE_WEBHOOK_SECRET") },
    { label: "Envoi d'emails (SMTP)", value: set("SMTP_HOST") ? "Configuré" : "Non configuré : les emails sont seulement écrits dans les journaux du serveur", ok: set("SMTP_HOST") },
    { label: "Stockage des images", value: process.env.STORAGE_DRIVER === "s3" ? "Stockage objet S3" : "Disque local du serveur", ok: true },
    { label: "Tâche planifiée (expiration des commandes)", value: set("CRON_SECRET") ? "Protégée par secret" : "Secret absent : la route est désactivée", ok: set("CRON_SECRET") },
  ];
}

export default async function SettingsAdmin() {
  await requireStaffPage("settings.manage");
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Réglages" description="Les clés et mots de passe ne sont jamais saisis ni affichés ici : ils se configurent dans les variables d'environnement du serveur." />
      <div className="space-y-6">
        <Card title="Intégrations">
          <dl className="divide-y divide-line text-sm">
            {integrations().map((i) => (
              <div key={i.label} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between">
                <dt className="font-medium">{i.label}</dt>
                <dd className={i.ok ? "text-sapin" : "text-ink-soft"}>{i.ok ? "● " : "○ "}{i.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-ink-mute">Voir README, section « Configurer le paiement », pour passer du mode démonstration à Stripe.</p>
        </Card>
        <SettingsSection
          section="store"
          title="Boutique"
          values={s.store}
          fields={[
            { key: "name", label: "Nom" },
            { key: "email", label: "Email de contact" },
            { key: "tagline", label: "Phrase de signature", wide: true },
            { key: "phone", label: "Téléphone" },
            { key: "vatRate", label: "Taux de TVA (%)", type: "number", hint: "Les prix sont saisis TTC." },
            { key: "address", label: "Adresse", type: "textarea" },
            { key: "logoUrl", label: "Logo (facultatif)", type: "image", wide: true },
          ]}
        />
        <SettingsSection
          section="shipping"
          title="Livraison"
          values={s.shipping}
          fields={[
            { key: "methodName", label: "Nom du mode de livraison" },
            { key: "flatRateCents", label: "Tarif (€ TTC)", type: "price" },
            { key: "freeThresholdCents", label: "Livraison offerte dès (€, vide = jamais)", type: "price" },
            { key: "countries", label: "Pays livrés (codes ISO séparés par des virgules)", type: "list", hint: "Ex. FR, BE, LU, MC" },
            { key: "delayText", label: "Délai affiché", type: "textarea" },
            { key: "preorderText", label: "Texte sur la précommande", type: "textarea" },
          ]}
        />
        <SettingsSection
          section="inventory"
          title="Stocks"
          values={s.inventory}
          fields={[
            { key: "preventOverselling", label: "Interdire la vente au-delà du stock (variantes suivies)", type: "checkbox" },
            { key: "lowStockThreshold", label: "Seuil d'alerte par défaut", type: "number" },
          ]}
        />
        <SettingsSection
          section="payment"
          title="Paiement"
          values={s.payment}
          fields={[
            { key: "checkoutNotice", label: "Message affiché au paiement", type: "textarea" },
            { key: "showInstallmentsNote", label: "Mentionner le paiement en plusieurs fois (uniquement s'il est activé dans Stripe)", type: "checkbox" },
          ]}
        />
        <SettingsSection
          section="legal"
          title="Informations légales"
          description="Utilisées dans les mentions légales et les CGV. Faites valider ces pages par un professionnel du droit avant la mise en ligne."
          values={s.legal}
          fields={[
            { key: "companyName", label: "Raison sociale" },
            { key: "legalForm", label: "Forme juridique et capital" },
            { key: "siret", label: "SIRET" },
            { key: "vatNumber", label: "N° de TVA intracommunautaire" },
            { key: "publisher", label: "Directeur de la publication" },
            { key: "host", label: "Hébergeur (nom, adresse, téléphone)" },
            { key: "mediator", label: "Médiateur de la consommation", type: "textarea" },
          ]}
        />
        <SettingsSection
          section="social"
          title="Réseaux sociaux"
          values={s.social}
          fields={[
            { key: "instagram", label: "Instagram (https://…)" },
            { key: "facebook", label: "Facebook" },
            { key: "tiktok", label: "TikTok" },
            { key: "pinterest", label: "Pinterest" },
          ]}
        />
        <SettingsSection
          section="newsletter"
          title="Newsletter"
          values={s.newsletter}
          fields={[
            { key: "enabled", label: "Proposer l'inscription", type: "checkbox" },
            { key: "title", label: "Titre", wide: true },
            { key: "consentText", label: "Texte de consentement (conservé avec chaque inscription)", type: "textarea" },
          ]}
        />
        <SettingsSection
          section="seo"
          title="Référencement"
          values={s.seo}
          fields={[
            { key: "defaultTitle", label: "Titre par défaut" },
            { key: "titleTemplate", label: "Modèle de titre (%s = titre de la page)" },
            { key: "defaultDescription", label: "Description par défaut", type: "textarea" },
            { key: "ogImageUrl", label: "Image de partage (1200 × 630)", type: "image", wide: true },
          ]}
        />
      </div>
    </>
  );
}
