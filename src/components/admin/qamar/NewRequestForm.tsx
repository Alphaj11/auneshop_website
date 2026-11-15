"use client";

import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { createQamarRequest } from "@/app/admin/actions/qamar";
import { QAMAR_PRIORITIES, QAMAR_TYPES, priorityLabels, typeLabels } from "@/lib/qamar";
import { ImagePicker } from "./ImagePicker";
import { nightBtn, nightInput, nightLabel } from "./MoonScene";

const typeHints = { demande: "Une nouvelle page, un texte, une fonction", amelioration: "Rendre plus beau, plus simple, plus rapide", probleme: "Quelque chose ne marche pas" };

/** Formulaire d'une nouvelle demande Qamar (erreurs de validation affichées sous chaque champ). */
export function NewRequestForm() {
  return (
    <ActionForm action={createQamarRequest} className="mt-5 space-y-5">
      {(state) => (
        <>
          <fieldset>
            <legend className={nightLabel}>Type</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {QAMAR_TYPES.map((t, i) => (
                <label key={t} className="flex cursor-pointer flex-col rounded border border-white/15 bg-white/[.03] p-3 has-[:checked]:border-[#efe6cf] has-[:checked]:bg-white/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#efe6cf]/50">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <input type="radio" name="type" value={t} defaultChecked={i === 0} className="accent-[#efe6cf]" />
                    {typeLabels[t]}
                  </span>
                  <span className="mt-1 text-xs text-white/60">{typeHints[t]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
            <div>
              <label htmlFor="q-title" className={nightLabel}>Titre</label>
              <input id="q-title" name="title" required minLength={4} maxLength={140} placeholder="Ex. Ajouter la nouvelle collection d'été" className={nightInput} aria-invalid={!!state.fieldErrors?.title} />
              {state.fieldErrors?.title && <p className="mt-1 text-sm text-[#ffb4a8]">{state.fieldErrors.title}</p>}
            </div>
            <div>
              <label htmlFor="q-priority" className={nightLabel}>Priorité</label>
              <select id="q-priority" name="priority" defaultValue="normale" className={nightInput}>
                {QAMAR_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{priorityLabels[p]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="q-description" className={nightLabel}>Description</label>
            <textarea id="q-description" name="description" required minLength={10} maxLength={5000} rows={6} placeholder="Ce que vous voulez, ce que vous voyez, ce que vous attendiez…" className={nightInput} aria-invalid={!!state.fieldErrors?.description} />
            {state.fieldErrors?.description && <p className="mt-1 text-sm text-[#ffb4a8]">{state.fieldErrors.description}</p>}
          </div>
          <div>
            <label htmlFor="q-page" className={nightLabel}>Page concernée (facultatif)</label>
            <input id="q-page" name="pageUrl" maxLength={500} placeholder="/produits/robe-lin ou https://…" className={nightInput} aria-invalid={!!state.fieldErrors?.pageUrl} />
            {state.fieldErrors?.pageUrl && <p className="mt-1 text-sm text-[#ffb4a8]">{state.fieldErrors.pageUrl}</p>}
          </div>
          <ImagePicker error={state.fieldErrors?.images} />
          <div className="flex justify-end">
            <Submit className={nightBtn} pendingLabel="Envoi…">Envoyer aux concepteurs</Submit>
          </div>
        </>
      )}
    </ActionForm>
  );
}
