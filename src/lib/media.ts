/**
 * Media URL helpers shared by server and client code (no server-only imports).
 *
 * Photos uploaded since images were re-encoded are stored as a pair:
 *   name.f.webp  — the full photo (what the database stores)
 *   name.t.webp  — its thumbnail
 * Older uploads and external links have no thumbnail, so they map to themselves.
 */
const FULL_SUFFIX = /\.f\.webp$/;

/** The thumbnail for a stored photo URL, or the URL itself when there is none. */
export function thumbUrl(url: string): string;
export function thumbUrl(url: string | null): string | null;
export function thumbUrl(url: string | null): string | null {
  return url && FULL_SUFFIX.test(url) ? url.replace(FULL_SUFFIX, ".t.webp") : url;
}

/**
 * A `srcSet` offering the thumbnail and the full photo by width, so the browser
 * downloads the smaller one where it's enough (phones, narrow cards). Undefined
 * for URLs without a thumbnail, leaving plain `src` behaviour.
 */
export function photoSrcSet(url: string | null): string | undefined {
  const thumb = thumbUrl(url);
  return url && thumb !== url ? `${thumb} 480w, ${url} 1600w` : undefined;
}
