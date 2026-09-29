import Link from "next/link";
import Brand from "@/components/Brand";
import { modules } from "@/lib/site";
import { getDict } from "@/lib/i18n";

export default async function SiteFooter() {
  const t = await getDict();
  return (
    <footer className="mt-auto border-t border-line bg-husk-deep">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <Brand href="/" />
          <p className="mt-4 max-w-sm text-sm text-stone">{t.brand.tagline}</p>
          <p className="log-label mt-4">{t.footer.officersOnly}</p>
        </div>
        <nav className="flex flex-col gap-2">
          <span className="log-label mb-1">{t.footer.membersArea}</span>
          {modules.map((m) => (
            <Link
              key={m.slug}
              href="/login"
              className="flex items-center gap-3 text-field/80 transition-colors hover:text-field"
            >
              <span className="log-label w-9 text-brand">{m.code}</span>
              <span>{t.boards[m.slug as keyof typeof t.boards].title}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-line px-5 py-4 text-center">
        <span className="log-label text-[0.62rem]">
          © {new Date().getFullYear()} {t.brand.name} — {t.footer.prototype}
        </span>
      </div>
    </footer>
  );
}
