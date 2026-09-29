import Link from "next/link";

/**
 * URL-driven pager. Emits `<basePath>?page=N` links so navigation is shareable
 * and works without JS. Renders nothing when everything fits on one page.
 */
export default function Pagination({
  page,
  pageCount,
  basePath,
}: {
  page: number;
  pageCount: number;
  basePath: string;
}) {
  if (pageCount <= 1) return null;

  const href = (n: number) => (n <= 1 ? basePath : `${basePath}?page=${n}`);
  // A compact window of page numbers around the current page.
  const from = Math.max(1, page - 2);
  const to = Math.min(pageCount, page + 2);
  const numbers = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  const box =
    "grid h-10 min-w-10 place-items-center rounded-lg border border-line px-3 text-sm font-semibold transition-colors";

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${box} text-field hover:bg-husk-deep`} aria-label="Previous page">
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
        <Link href={href(page + 1)} className={`${box} text-field hover:bg-husk-deep`} aria-label="Next page">
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
