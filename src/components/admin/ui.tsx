import Link from "next/link";

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {back && <Link href={back.href} className="text-sm text-ink-soft hover:text-ink">← {back.label}</Link>}
        <h1 className="mt-1 font-display text-3xl md:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={`rounded-lg border border-line bg-white/70 ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-medium">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-16 text-center">
      <p className="font-display text-xl">{title}</p>
      {text && <p className="mt-2 max-w-sm text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white/70 p-5">
      <p className="text-xs uppercase tracking-[0.12em] text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export function TestBadge() {
  return <span className="rounded bg-vanille/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">Test</span>;
}

export const inputCls = "w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
export const labelCls = "mb-1 block text-xs font-medium text-ink-soft";
export const btnSm = "rounded border border-line bg-white px-3 py-1.5 text-sm hover:border-ink disabled:opacity-50";
export const btnPrimarySm = "rounded bg-ink px-4 py-2 text-sm text-paper hover:bg-terre disabled:opacity-50";
export const btnDangerSm = "rounded border border-danger/40 bg-white px-3 py-1.5 text-sm text-danger hover:bg-danger hover:text-white disabled:opacity-50";
