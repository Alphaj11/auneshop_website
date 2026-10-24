"use client";

import { useMemo, useState } from "react";
import { ActionForm, Submit } from "./ActionForm";
import { btnSm, inputCls } from "./ui";
import { setCollectionProducts } from "@/app/admin/actions/collections";
import { formatPrice } from "@/lib/money";

type P = { id: string; name: string; status: string; priceCents: number; imageUrl: string | null };

/** Choix et ordre des produits d'une collection (l'ordre est celui de la scène et de la grille). */
export function CollectionProductsEditor({ collectionId, all, initial }: { collectionId: string; all: P[]; initial: string[] }) {
  const [ids, setIds] = useState(initial);
  const version = initial.join();
  const [seen, setSeen] = useState(version);
  if (seen !== version) {
    setSeen(version);
    setIds(initial);
  }
  const [q, setQ] = useState("");
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);
  const candidates = all.filter((p) => !ids.includes(p.id) && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  const move = (i: number, d: number) =>
    setIds((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <ActionForm action={setCollectionProducts} className="grid gap-6 lg:grid-cols-2">
      <input type="hidden" name="collectionId" value={collectionId} />
      <input type="hidden" name="productIds" value={JSON.stringify(ids)} />
      <div>
        <h3 className="mb-2 text-sm font-medium">Dans la collection ({ids.length})</h3>
        {ids.length > 9 && <p className="mb-2 text-xs text-ink-soft">La scène orbitale montre les 9 premiers ; tous restent visibles dans la grille.</p>}
        <ol className="space-y-1.5">
          {ids.map((id, i) => {
            const p = byId.get(id);
            if (!p) return null;
            return (
              <li key={id} className="flex items-center gap-3 rounded border border-line bg-white p-2 text-sm">
                <span className="w-5 text-right text-xs tabular-nums text-ink-mute">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-10 w-8 rounded bg-paper-2 object-cover" /> : <span className="h-10 w-8 rounded bg-paper-2" />}
                <span className="flex-1">
                  {p.name}
                  {p.status !== "active" && <span className="ml-2 text-xs text-danger">non visible ({p.status === "draft" ? "brouillon" : "archivé"})</span>}
                </span>
                <button type="button" onClick={() => move(i, -1)} className="px-1.5" aria-label={`Monter ${p.name}`}>↑</button>
                <button type="button" onClick={() => move(i, 1)} className="px-1.5" aria-label={`Descendre ${p.name}`}>↓</button>
                <button type="button" onClick={() => setIds((l) => l.filter((x) => x !== id))} className="px-1.5 text-danger" aria-label={`Retirer ${p.name}`}>✕</button>
              </li>
            );
          })}
        </ol>
        <Submit className="mt-4 rounded bg-ink px-4 py-2 text-sm text-paper">Enregistrer l&apos;ordre</Submit>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">Ajouter des produits</h3>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className={`${inputCls} mb-2`} aria-label="Rechercher un produit à ajouter" />
        <ul className="space-y-1.5">
          {candidates.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded border border-line/60 p-2 text-sm">
              <span className="flex-1">{p.name} <span className="text-xs text-ink-mute">{formatPrice(p.priceCents)}</span></span>
              <button type="button" className={btnSm} onClick={() => setIds((l) => [...l, p.id])}>Ajouter</button>
            </li>
          ))}
          {candidates.length === 0 && <li className="text-sm text-ink-soft">Aucun autre produit.</li>}
        </ul>
      </div>
    </ActionForm>
  );
}
