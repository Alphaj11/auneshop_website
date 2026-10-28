import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { NewRequestForm } from "@/components/admin/qamar/NewRequestForm";
import { QamarNight, nightCard, statusTone } from "@/components/admin/qamar/MoonScene";
import { requireStaffPage } from "@/lib/auth/guards";
import { dateTimeFr } from "@/lib/labels";
import { QAMAR_STATUSES, priorityLabels, statusLabels, typeLabels } from "@/lib/qamar";

export const metadata = { title: "Qamar" };


export default async function QamarPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  await requireStaffPage("qamar.create");
  const { statut } = await searchParams;
  const filter = QAMAR_STATUSES.find((s) => s === statut);

  const [requests, counts] = await Promise.all([
    db.query.designerRequests.findMany({
      where: filter ? eq(schema.designerRequests.status, filter) : undefined,
      orderBy: [desc(schema.designerRequests.updatedAt)],
      limit: 100,
      with: { author: { columns: { firstName: true, lastName: true, email: true } }, attachments: { columns: { id: true } }, messages: { columns: { id: true } } },
    }),
    db.select({ status: schema.designerRequests.status, n: count() }).from(schema.designerRequests).groupBy(schema.designerRequests.status),
  ]);
  const total = counts.reduce((a, c) => a + c.n, 0);

  return (
    <QamarNight>
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Qamar · قمر</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">Un mot pour les concepteurs du site</h1>
        <p className="mt-3 text-white/75">
          Une demande, une idée d&apos;amélioration, un problème : écrivez-nous ici, joignez des captures d&apos;écran, et suivez
          la réponse. Chaque envoi nous parvient directement.
        </p>
      </header>

      <div className="mt-10 grid items-start gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section aria-labelledby="q-nouvelle" className={`${nightCard} p-5 md:p-7`}>
          <h2 id="q-nouvelle" className="font-display text-2xl">Nouvelle demande</h2>
          <NewRequestForm />
        </section>

        <section aria-labelledby="q-suivi">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="q-suivi" className="font-display text-2xl">Suivi</h2>
            <nav aria-label="Filtrer par statut" className="flex flex-wrap gap-1.5 text-xs">
              <Link href="/admin/qamar" aria-current={!filter ? "page" : undefined} className={`rounded-full px-3 py-1.5 ${!filter ? "bg-[#efe6cf] text-[#0b1322]" : "border border-white/20 text-white/80 hover:border-white/50"}`}>
                Toutes ({total})
              </Link>
              {QAMAR_STATUSES.map((s) => (
                <Link key={s} href={`/admin/qamar?statut=${s}`} aria-current={filter === s ? "page" : undefined} className={`rounded-full px-3 py-1.5 ${filter === s ? "bg-[#efe6cf] text-[#0b1322]" : "border border-white/20 text-white/80 hover:border-white/50"}`}>
                  {statusLabels[s]} ({counts.find((c) => c.status === s)?.n ?? 0})
                </Link>
              ))}
            </nav>
          </div>
          {requests.length === 0 ? (
            <div className={`${nightCard} mt-4 px-6 py-12 text-center`}>
              <p className="font-display text-xl">La nuit est calme.</p>
              <p className="mt-2 text-sm text-white/65">Aucune demande {filter ? `« ${statusLabels[filter].toLowerCase()} »` : "pour l'instant"}.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/qamar/${r.id}`} className={`${nightCard} block p-4 transition-colors hover:border-white/35 focus-visible:outline-2 focus-visible:outline-[#efe6cf]`}>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${statusTone[r.status]}`}>{statusLabels[r.status]}</span>
                      <span className="text-white/70">{typeLabels[r.type]}</span>
                      <span className="text-white/40">·</span>
                      <span className={r.priority === "urgente" || r.priority === "haute" ? "text-[#ffcf9e]" : "text-white/70"}>Priorité {priorityLabels[r.priority].toLowerCase()}</span>
                    </div>
                    <p className="mt-2 font-display text-xl leading-snug">{r.title}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {r.author ? `${r.author.firstName} ${r.author.lastName}`.trim() || r.author.email : "Compte supprimé"} · {dateTimeFr(r.createdAt)}
                      {r.attachments.length > 0 && ` · ${r.attachments.length} image${r.attachments.length > 1 ? "s" : ""}`}
                      {r.messages.length > 0 && ` · ${r.messages.length} message${r.messages.length > 1 ? "s" : ""}`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </QamarNight>
  );
}
