import Link from "next/link";
import { getDict } from "@/lib/i18n";

/**
 * URL-driven pager. Emits `<basePath>?page=N` links so navigation is shareable
 * and works without JS. Renders nothing when everything fits on one page.
 */
export default async function Pagination({
  page,
  pageCount,
  basePath,
  query = {},
}: {
  page: number;
  pageCount: number;
  basePath: string;
  /** Other search params (e.g. filters) to keep on every page link. */
  query?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const t = (await getDict()).pager;

  const href = (n: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  // A compact window of page numbers around the current page.
  const from = Math.max(1, page - 2);
  const to = Math.min(pageCount, page + 2);
  const numbers = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  const box =
    "grid h-10 min-w-10 place-items-center rounded-lg border border-line px-3 text-sm font-semibold transition-colors";

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label={t.label}>
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${box} text-field hover:bg-husk-deep`} aria-label={t.previous}>
          ‹
        </Link>
      ) : (
        <span className={`${box} cursor-not-allowed text-stone/40`} aria-hidden>
          ‹
        </span>
      )}

      {from > 1 && (
        <>
          <Link href={href(1)} className={`${box} text-field hover:bg-husk-deep`}>
            1
          </Link>
          {from > 2 && <span className="px-1 text-stone">…</span>}
        </>
      )}

      {numbers.map((n) =>
        n === page ? (
          <span key={n} className={`${box} border-field bg-field text-husk`} aria-current="page">
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)} className={`${box} text-field hover:bg-husk-deep`}>
            {n}
          </Link>
        ),
      )}

      {to < pageCount && (
        <>
          {to < pageCount - 1 && <span className="px-1 text-stone">…</span>}
          <Link href={href(pageCount)} className={`${box} text-field hover:bg-husk-deep`}>
            {pageCount}
          </Link>
        </>
      )}

      {page < pageCount ? (
        <Link href={href(page + 1)} className={`${box} text-field hover:bg-husk-deep`} aria-label={t.next}>
          ›
        </Link>
      ) : (
        <span className={`${box} cursor-not-allowed text-stone/40`} aria-hidden>
          ›
        </span>
      )}
    </nav>
  );
}
