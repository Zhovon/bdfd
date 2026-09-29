import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { interpolate } from "@/lib/messages";

/**
 * Search box + status filter for an admin list. A plain GET form, so filters
 * live in the URL (shareable, back-button friendly) and it works without JS.
 * Submitting starts again from page 1.
 */
export default async function ListFilters({
  basePath,
  q,
  status,
  statuses,
  placeholder,
  total,
  page,
  perPage,
}: {
  basePath: string;
  q?: string;
  status?: string;
  /** Status value → display label. */
  statuses: Record<string, string>;
  placeholder: string;
  total: number;
  page: number;
  perPage: number;
}) {
  const dict = await getDict();
  const t = dict.adminUi;
  const num = new Intl.NumberFormat(dict.intl).format;
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  const filtered = Boolean(q || status);
  const field = "rounded-lg border border-line bg-husk px-3 py-2 text-sm text-field outline-none focus:border-brand";

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <form action={basePath} method="get" role="search" className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          aria-label={t.search}
          className={`${field} min-w-0 flex-1 basis-56`}
        />
        <select name="status" defaultValue={status ?? ""} aria-label={t.colStatus} className={field}>
          <option value="">{t.allStatuses}</option>
          {Object.entries(statuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-husk transition-transform hover:-translate-y-0.5">
          {t.search}
        </button>
        {filtered && (
          <Link href={basePath} className="log-label text-stone hover:text-field hover:underline">
            {t.clear}
          </Link>
        )}
      </form>
      <span className="log-label text-stone">
        {interpolate(t.showing, { from: num(from), to: num(to), total: num(total) })}
      </span>
    </div>
  );
}
