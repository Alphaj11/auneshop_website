"use client";

import { useState } from "react";
import { Submit } from "./ActionForm";
import { inputCls } from "./ui";

/** Barre d'actions groupées : les cases « ids » du tableau appartiennent au même formulaire. */
export function BulkBar({ ops }: { ops: { value: string; label: string; danger?: boolean }[] }) {
  const [op, setOp] = useState(ops[0]?.value ?? "");
  const danger = ops.find((o) => o.value === op)?.danger;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4"
          aria-label="Tout sélectionner"
          onChange={(e) => {
            e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((c) => (c.checked = e.currentTarget.checked));
          }}
        />
        Tout
      </label>
      <select name="op" value={op} onChange={(e) => setOp(e.target.value)} className={`${inputCls} !w-auto`} aria-label="Action groupée">
        {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {op === "price" && <input name="percent" placeholder="ex. -10 ou 5" className={`${inputCls} !w-32`} aria-label="Variation en %" />}
      <span
        onClickCapture={(e) => {
          if (danger && !window.confirm("Cette action est définitive. Continuer ?")) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <Submit className={danger ? "rounded bg-danger px-4 py-2 text-sm text-white" : "rounded bg-ink px-4 py-2 text-sm text-paper"} pendingLabel="…">Appliquer</Submit>
      </span>
    </div>
  );
}
