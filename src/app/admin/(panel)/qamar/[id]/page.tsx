import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { QamarNight, nightBtn, nightCard, nightInput, nightLabel, statusTone } from "@/components/admin/qamar/MoonScene";
import { replyQamarRequest, setQamarStatus } from "@/app/admin/actions/qamar";
import { requireStaffPage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { dateTimeFr } from "@/lib/labels";
import { QAMAR_STATUSES, priorityLabels, statusLabels, typeLabels } from "@/lib/qamar";

export const metadata = { title: "Qamar" };

const who = (a: { firstName: string; lastName: string; email: string } | null) => (a ? `${a.firstName} ${a.lastName}`.trim() || a.email : "Compte supprimé");

export default async function QamarRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ envoye?: string }> }) {
  const user = await requireStaffPage("qamar.create");
  const { id } = await params;
  const { envoye } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const author = { columns: { firstName: true, lastName: true, email: true } } as const;
  const r = await db.query.designerRequests.findFirst({
    where: eq(schema.designerRequests.id, id),
    with: {
      author,
      attachments: { orderBy: [asc(schema.designerRequestAttachments.createdAt)] },
      messages: { orderBy: [asc(schema.designerRequestMessages.createdAt)], with: { author } },
    },
  });
  if (!r) notFound();
  const canManage = can(user.role, "qamar.manage");

  return (
    <QamarNight>
      <Link href="/admin/qamar" className="text-sm text-white/70 hover:text-white">← Toutes les demandes</Link>
      {envoye && (
        <p role="status" className="mt-4 max-w-3xl rounded border border-[#7fc9a0]/40 bg-[#7fc9a0]/10 px-4 py-3 text-sm text-[#d6f2e1]">
          Demande envoyée. Les concepteurs la voient dès maintenant ; vous pourrez suivre leur réponse ici.
        </p>
      )}

      <div className="mt-6 grid items-start gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <article className={`${nightCard} p-5 md:p-7`}>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${statusTone[r.status]}`}>{statusLabels[r.status]}</span>
            <span className="text-white/70">{typeLabels[r.type]}</span>
            <span className="text-white/40">·</span>
            <span className={r.priority === "urgente" || r.priority === "haute" ? "text-[#ffcf9e]" : "text-white/70"}>Priorité {priorityLabels[r.priority].toLowerCase()}</span>
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight md:text-4xl">{r.title}</h1>
          <p className="mt-2 text-xs text-white/55">{who(r.author)} · {dateTimeFr(r.createdAt)}</p>
          <p className="mt-6 whitespace-pre-wrap leading-relaxed text-white/90">{r.description}</p>
          {r.pageUrl && (
            <p className="mt-5 text-sm">
              <span className="text-white/60">Page concernée : </span>
              <a href={r.pageUrl} target="_blank" rel="noopener noreferrer" className="break-all underline decoration-white/40 underline-offset-4 hover:decoration-white">
                {r.pageUrl}
              </a>
            </p>
          )}
          {r.attachments.length > 0 && (
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Images jointes">
              {r.attachments.map((a, i) => (
                <li key={a.id}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] overflow-hidden rounded border border-white/15 hover:border-white/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={`Image jointe ${i + 1}`} className="h-full w-full object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </article>

        <div className="space-y-6">
          {canManage && (
            <section className={`${nightCard} p-5`} aria-labelledby="q-statut">
              <h2 id="q-statut" className="text-xs font-medium uppercase tracking-[0.12em] text-white/70">Statut</h2>
              <ActionForm action={setQamarStatus} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={r.id} />
                {QAMAR_STATUSES.map((s) => (
                  <Submit key={s} name="status" value={s} pendingLabel="…" className={`rounded-full px-3 py-1.5 text-sm ${r.status === s ? statusTone[s] : "border border-white/20 text-white/80 hover:border-white/50"}`}>
                    {statusLabels[s]}
                  </Submit>
                ))}
              </ActionForm>
            </section>
          )}

          <section className={`${nightCard} p-5`} aria-labelledby="q-fil">
            <h2 id="q-fil" className="font-display text-2xl">Échanges</h2>
            {r.messages.length === 0 ? (
              <p className="mt-3 text-sm text-white/60">Pas encore de message. Ajoutez une précision ou répondez ici.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {r.messages.map((m) => (
                  <li key={m.id} className="border-l border-white/20 pl-4">
                    <p className="text-xs text-white/55">{who(m.author)} · {dateTimeFr(m.createdAt)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/90">{m.message}</p>
                  </li>
                ))}
              </ol>
            )}
            <ActionForm action={replyQamarRequest} resetOnSuccess className="mt-5 space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <div>
                <label htmlFor="q-reply" className={nightLabel}>Votre message</label>
                <textarea id="q-reply" name="message" required minLength={2} maxLength={5000} rows={4} className={nightInput} />
              </div>
              <div className="flex justify-end">
                <Submit className={nightBtn} pendingLabel="Envoi…">Envoyer</Submit>
              </div>
            </ActionForm>
          </section>
        </div>
      </div>
    </QamarNight>
  );
}
