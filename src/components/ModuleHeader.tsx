import type { Module } from "@/lib/site";

/** Shared header for members' module pages: code badge + title + blurb. */
export default function ModuleHeader({ mod, children }: { mod: Module; children?: React.ReactNode }) {
  return (
    <header className="border-b border-line pb-6">
      <div className="flex items-center gap-3">
        <span className="seal relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-field font-[family-name:var(--font-display)] text-xs font-bold text-grain">
          {mod.code}
        </span>
        <span className="log-label text-brand">Members&apos; module</span>
      </div>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-field sm:text-4xl">
        {mod.title}
      </h1>
      <p className="mt-2 max-w-2xl text-stone">{mod.blurb}</p>
      {children}
    </header>
  );
}
