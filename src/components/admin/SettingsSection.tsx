import { ActionForm, Submit } from "./ActionForm";
import { Card, inputCls, labelCls } from "./ui";
import { saveSettingsSection } from "@/app/admin/actions/settings";
import { centsToInput } from "@/lib/money";

export type SettingField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "price" | "checkbox" | "select" | "list" | "image";
  options?: [string, string][];
  hint?: string;
  wide?: boolean;
  step?: string;
};

/** Formulaire générique pour une section des réglages (rendu serveur). */
export function SettingsSection({ section, title, values, fields, extra, description }: { section: string; title: string; values: Record<string, unknown>; fields: SettingField[]; extra?: React.ReactNode; description?: React.ReactNode }) {
  return (
    <Card title={title}>
      <ActionForm action={saveSettingsSection} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="section" value={section} />
        {description && <div className="text-sm text-ink-soft md:col-span-2">{description}</div>}
        {fields.map((f) => {
          const id = `${section}-${f.key}`;
          const v = values[f.key];
          const wide = f.wide || f.type === "textarea";
          if (f.type === "checkbox")
            return (
              <label key={f.key} className="flex items-start gap-2 text-sm md:col-span-2">
                <input type="checkbox" name={`f.${f.key}`} defaultChecked={!!v} className="mt-0.5 h-4 w-4" />
                <span>{f.label}{f.hint && <span className="block text-xs text-ink-mute">{f.hint}</span>}</span>
              </label>
            );
          return (
            <div key={f.key} className={wide ? "md:col-span-2" : ""}>
              <label htmlFor={id} className={labelCls}>{f.label}</label>
              {f.type === "textarea" ? (
                <textarea id={id} name={`f.${f.key}`} rows={3} defaultValue={String(v ?? "")} className={inputCls} />
              ) : f.type === "select" ? (
                <select id={id} name={`f.${f.key}`} defaultValue={String(v)} className={inputCls}>
                  {f.options?.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              ) : f.type === "image" ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v ? <img src={String(v)} alt="" className="h-12 w-20 rounded bg-paper-2 object-contain" /> : null}
                  <input id={id} type="file" name={`file.${f.key}`} accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" />
                  {v ? <label className="flex items-center gap-1 text-xs"><input type="checkbox" name={`remove.${f.key}`} /> Retirer</label> : null}
                </div>
              ) : (
                <input
                  id={id}
                  name={`f.${f.key}`}
                  type={f.type === "number" ? "number" : "text"}
                  step={f.step}
                  inputMode={f.type === "price" ? "decimal" : undefined}
                  defaultValue={f.type === "price" ? centsToInput(v as number | null) : f.type === "list" ? (v as string[]).join(", ") : String(v ?? "")}
                  className={inputCls}
                />
              )}
              {f.hint && <p className="mt-1 text-xs text-ink-mute">{f.hint}</p>}
            </div>
          );
        })}
        {extra}
        <div className="md:col-span-2">
          <Submit className="rounded bg-ink px-4 py-2 text-sm text-paper hover:bg-terre">Enregistrer</Submit>
        </div>
      </ActionForm>
    </Card>
  );
}
