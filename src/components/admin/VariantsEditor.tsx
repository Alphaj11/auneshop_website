"use client";

import { useState } from "react";
import { ActionForm, Submit } from "./ActionForm";
import { btnSm, inputCls } from "./ui";
import { saveVariants } from "@/app/admin/actions/products";

export type VariantRow = {
  id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  price: string;
  stock: number;
  trackInventory: boolean;
  lowStockThreshold: number;
  isActive: boolean;
};

const cell = `${inputCls} !px-2 !py-1.5`;

function skuPart(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase();
}

export function VariantsEditor({ productId, skuPrefix, initial, version }: { productId: string; skuPrefix: string; initial: VariantRow[]; version: string }) {
  const [rows, setRows] = useState<VariantRow[]>(initial);
  // Après enregistrement, le serveur renvoie les variantes avec leurs identifiants : on resynchronise.
  const [seen, setSeen] = useState(version);
  if (seen !== version) {
    setSeen(version);
    setRows(initial);
  }
  const [sizes, setSizes] = useState("XS, S, M, L, XL");
  const [colors, setColors] = useState("");
  const set = (i: number, patch: Partial<VariantRow>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const blank = (size: string, color: string, hex = ""): VariantRow => ({
    sku: `${skuPrefix}-${skuPart(color)}-${skuPart(size)}`,
    size,
    color,
    colorHex: hex,
    price: "",
    stock: 0,
    trackInventory: true,
    lowStockThreshold: 3,
    isActive: true,
  });

  function generate() {
    const ss = sizes.split(",").map((s) => s.trim()).filter(Boolean);
    const cs = colors.split(",").map((s) => s.trim()).filter(Boolean);
    const next = [...rows];
    for (const c of cs.length ? cs : ["Unique"])
      for (const s of ss.length ? ss : ["Unique"])
        if (!next.some((r) => r.size.toLowerCase() === s.toLowerCase() && r.color.toLowerCase() === c.toLowerCase()))
          next.push(blank(s, c, next.find((r) => r.color === c)?.colorHex ?? ""));
    setRows(next);
  }

  return (
    <ActionForm action={saveVariants}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />
      <div className="mb-4 grid gap-2 rounded border border-dashed border-line p-3 text-sm sm:grid-cols-[1fr_1fr_auto]">
        <input value={sizes} onChange={(e) => setSizes(e.target.value)} className={cell} aria-label="Tailles, séparées par des virgules" placeholder="Tailles : XS, S, M" />
        <input value={colors} onChange={(e) => setColors(e.target.value)} className={cell} aria-label="Couleurs, séparées par des virgules" placeholder="Couleurs : Écru, Terre" />
        <button type="button" onClick={generate} className={btnSm}>Générer les combinaisons</button>
      </div>
      <div className="overflow-x-auto">
        <table className="admin-table min-w-[900px]">
          <thead>
            <tr>
              <th>Couleur</th><th>Pastille</th><th>Taille</th><th>SKU</th><th>Prix spécifique</th><th>Stock</th><th>Suivi</th><th>Alerte</th><th>Active</th><th><span className="sr-only">Supprimer</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? `new-${i}`}>
                <td><input value={r.color} onChange={(e) => set(i, { color: e.target.value })} className={cell} aria-label="Couleur" /></td>
                <td>
                  <input type="color" value={r.colorHex || "#cccccc"} onChange={(e) => set(i, { colorHex: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-line" aria-label="Couleur de la pastille" />
                </td>
                <td><input value={r.size} onChange={(e) => set(i, { size: e.target.value })} className={`${cell} !w-20`} aria-label="Taille" /></td>
                <td><input value={r.sku} onChange={(e) => set(i, { sku: e.target.value })} className={`${cell} font-mono !text-xs`} aria-label="SKU" /></td>
                <td><input value={r.price} onChange={(e) => set(i, { price: e.target.value })} placeholder="—" inputMode="decimal" className={`${cell} !w-24`} aria-label="Prix spécifique en euros" /></td>
                <td><input type="number" min={0} value={r.stock} onChange={(e) => set(i, { stock: Math.max(0, Number(e.target.value) || 0) })} className={`${cell} !w-20`} aria-label="Stock" disabled={!r.trackInventory} /></td>
                <td><input type="checkbox" checked={r.trackInventory} onChange={(e) => set(i, { trackInventory: e.target.checked })} className="h-4 w-4" aria-label="Suivre le stock" /></td>
                <td><input type="number" min={0} value={r.lowStockThreshold} onChange={(e) => set(i, { lowStockThreshold: Number(e.target.value) || 0 })} className={`${cell} !w-16`} aria-label="Seuil d'alerte" /></td>
                <td><input type="checkbox" checked={r.isActive} onChange={(e) => set(i, { isActive: e.target.checked })} className="h-4 w-4" aria-label="Variante active" /></td>
                <td>
                  <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="text-danger" aria-label={`Supprimer ${r.color} ${r.size}`}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="py-4 text-sm text-ink-soft">Aucune variante : le produit ne pourra pas être acheté. Générez au moins une combinaison.</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setRows((r) => [...r, blank("Unique", r.at(-1)?.color ?? "Unique", r.at(-1)?.colorHex)])} className={btnSm}>+ Ajouter une ligne</button>
        <div className="flex items-center gap-3">
          <p className="text-xs text-ink-mute">Chaque modification de stock est enregistrée dans l&apos;historique.</p>
          <Submit className="rounded bg-ink px-4 py-2 text-sm text-paper hover:bg-terre">Enregistrer les variantes</Submit>
        </div>
      </div>
    </ActionForm>
  );
}
