import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { AddressCard, AddressForm } from "@/components/account/AccountForms";
import { requireUser } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Mes adresses" };

export default async function AddressesPage() {
  const user = await requireUser("/compte/adresses");
  const [addresses, settings] = await Promise.all([
    db.query.addresses.findMany({ where: eq(schema.addresses.userId, user.id), orderBy: [asc(schema.addresses.createdAt)] }),
    getSettings(),
  ]);
  return (
    <div className="space-y-12">
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => <AddressCard key={a.id} address={a} countries={settings.shipping.countries} />)}
        {!addresses.length && <p className="text-ink-soft">Aucune adresse enregistrée.</p>}
      </div>
      <section aria-labelledby="new-address" className="max-w-2xl">
        <h2 id="new-address" className="display-md mb-6">Ajouter une adresse</h2>
        <AddressForm countries={settings.shipping.countries} />
      </section>
    </div>
  );
}
