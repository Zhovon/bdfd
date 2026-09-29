/**
 * Shared pagination and search helpers for list pages. Pure functions: the
 * data-access modules run the queries, these only do the arithmetic.
 */

/** A single windowed page of results plus the totals needed to draw controls. */
export type Paged<T> = {
  items: T[];
  total: number; // matching rows across all pages
  page: number; // the (clamped) 1-based page returned
  pageCount: number; // total number of pages (>= 1)
};

/**
 * Clamp a requested page into range for `total` rows, and return the SQL
 * OFFSET to fetch it. Anything non-numeric or out of range lands on a real page.
 */
export function pageWindow(total: number, requested: number, perPage: number) {
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, Math.floor(requested) || 1), pageCount);
  return { page, pageCount, offset: (page - 1) * perPage };
}

/**
 * Turn free-text search into an ILIKE "contains" pattern, escaping LIKE's own
 * wildcards so a search for "50%" or "a_b" matches literally. Use with
 * `ILIKE $n ESCAPE '\'`. Returns null for a blank search.
 */
export function likePattern(q: string | undefined | null): string | null {
  const term = (q ?? "").trim().slice(0, 100);
  if (!term) return null;
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
