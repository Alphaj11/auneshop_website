export function AuthShell({ title, subtitle, children, aside }: { title: string; subtitle?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[80svh] max-w-[1600px] gap-12 px-5 pb-10 pt-28 md:px-10 lg:grid-cols-2 lg:pt-36">
      <div className="mx-auto w-full max-w-md">
        <h1 className="display-lg">{title}</h1>
        {subtitle && <p className="mt-4 text-ink-soft">{subtitle}</p>}
        <div className="mt-10">{children}</div>
        {aside && <div className="mt-10 border-t border-line pt-8">{aside}</div>}
      </div>
      <div className="relative hidden overflow-hidden rounded-[3px] bg-paper-2 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/demo/story/tissage.svg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    </div>
  );
}
