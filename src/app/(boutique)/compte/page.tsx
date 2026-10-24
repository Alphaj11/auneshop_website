import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/account/AccountForms";
import { requireUser } from "@/lib/auth/guards";
import { StatusBadge, dateFr } from "@/lib/labels";
import { formatPrice } from "@/lib/money";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser();
  const [profile, lastOrder] = await Promise.all([
    db.query.customerProfiles.findFirst({ where: eq(schema.customerProfiles.userId, user.id) }),
    db.query.orders.findFirst({ where: eq(schema.orders.userId, user.id), orderBy: [desc(schema.orders.createdAt)] }),
  ]);
  return (
    <div className="space-y-16">
      {lastOrder && (
        <section aria-labelledby="last-order">
          <h2 id="last-order" className="eyebrow !text-ink">Dernière commande</h2>
          <Link href={`/compte/commandes/${lastOrder.number}`} className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded border border-line p-5 hover:border-ink">
            <span className="font-display text-xl">{lastOrder.number}</span>
            <span className="text-sm text-ink-soft">{dateFr(lastOrder.createdAt)}</span>
            <StatusBadge status={lastOrder.status} />
            <span className="tabular-nums">{formatPrice(lastOrder.totalCents)}</span>
          </Link>
        </section>
      )}
      <section aria-labelledby="profile">
        <h2 id="profile" className="display-md mb-6">Informations personnelles</h2>
        <ProfileForm initial={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: profile?.phone ?? "", marketing: profile?.acceptsMarketing ?? false }} />
      </section>
      <section aria-labelledby="security">
        <h2 id="security" className="display-md mb-6">Sécurité</h2>
        <PasswordForm />
      </section>
      <section aria-labelledby="privacy" className="border-t border-line pt-10">
        <h2 id="privacy" className="eyebrow mb-4 !text-ink">Données personnelles</h2>
        <p className="mb-4 max-w-xl text-sm text-ink-soft">
          Vous pouvez demander la suppression de votre compte à tout moment. Pour toute autre demande (accès, rectification, portabilité), écrivez-nous depuis la page <Link href="/contact" className="underline">contact</Link>.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
