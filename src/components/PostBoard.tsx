import Link from "next/link";
import { acceptsPayment, type PostCard } from "@/lib/content";
import { categoryMeta } from "@/lib/site";
import { getDict, type Dict } from "@/lib/i18n";

const fmtDay = (d: Date, locale: string) => new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(new Date(d));
const fmtMon = (d: Date, locale: string) => new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(d));
const isNew = (d: Date) => Date.now() - new Date(d).getTime() < 7 * 24 * 3600 * 1000;
const taka = (n: number) => `৳ ${n.toLocaleString("en-BD")}`;

/** Text for the card's payment button. */
function payButtonLabel(p: PostCard, t: Dict): string {
  if (p.paymentMode === "participation")
    return p.feeAmount ? `${t.payments.participate} · ${taka(p.feeAmount)}` : t.payments.participate;
  return t.payments.donate;
}

/** Board list — each notice is a card linking to its full post. */
export default async function PostBoard({
  posts,
  empty,
  showCategory = false,
}: {
  posts: PostCard[];
  empty?: string;
  showCategory?: boolean;
}) {
  const t = await getDict();
  const boardLabel = (c: string) => t.boards[c as keyof typeof t.boards]?.label ?? c;

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-10 text-center">
        <p className="text-stone">{empty ?? t.card.nothingPosted}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {posts.map((p) => {
        const meta = categoryMeta(p.category);
        const hasPayment = acceptsPayment(p);
        return (
          // The whole card links to the notice via a stretched link on the title;
          // the payment button sits above it (z-10) with its own destination.
          <div
            key={p.id}
            className="lift group relative flex flex-col overflow-hidden rounded-xl border border-line bg-husk shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]"
          >
            {/* Category accent — a fine top rule that sweeps in on hover */}
            <span
              className="absolute inset-x-0 top-0 z-10 h-[3px] origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
              style={{ backgroundColor: meta.accent }}
              aria-hidden
            />
            {/* Cover (or a colored placeholder band keyed to the category) */}
            <div className="relative aspect-[16/9] w-full overflow-hidden" style={{ backgroundColor: meta.tint }}>
              {p.cover ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.cover}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center font-[family-name:var(--font-display)] text-3xl font-bold opacity-30"
                  style={{ color: meta.accent }}
                >
                  {boardLabel(p.category)}
                </span>
              )}
              {/* Legibility scrim, deepened on hover */}
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-field/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                aria-hidden
              />
              {(p.photoCount > 1 || p.hasVideo || p.hasPdf) && (
                <div className="absolute bottom-2 right-2 flex flex-wrap items-center justify-end gap-1.5">
                  {p.photoCount > 1 && (
                    <span className="log-label rounded-full bg-field/80 px-2 py-1 text-husk">
                      {p.photoCount} {t.card.photos}
                    </span>
                  )}
                  {p.hasVideo && (
                    <span className="log-label inline-flex items-center gap-1 rounded-full bg-field/80 px-2 py-1 text-husk">
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
                        <path d="M2 1l6 4-6 4z" />
                      </svg>
                      {t.card.video}
                    </span>
                  )}
                  {p.hasPdf && (
                    <span className="log-label rounded-full bg-field/80 px-2 py-1 text-husk">{t.card.pdf}</span>
                  )}
                </div>
              )}
              {isNew(p.created_at) && (
                <span className="log-label absolute left-2 top-2 rounded-full bg-grain px-2.5 py-1 text-husk">
                  {t.card.new}
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center gap-2">
                {showCategory && (
                  <span className="log-label" style={{ color: meta.accent }}>
                    {boardLabel(p.category)}
                  </span>
                )}
                <span className="log-label text-stone">
                  {fmtDay(p.created_at, t.intl)} {fmtMon(p.created_at, t.intl)}
                </span>
              </div>
              <h3 className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-bold leading-snug text-field">
                <Link
                  href={`/portal/notice/${p.id}`}
                  className="transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
                >
                  {p.title}
                </Link>
              </h3>
              {p.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone">{p.excerpt}</p>}

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="log-label inline-flex items-center gap-1 text-brand">
                  {t.card.readMore} <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
                {hasPayment &&
                  (p.paymentOpen ? (
                    <Link
                      href={`/portal/pay/${p.id}`}
                      className="relative z-10 shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-husk transition-transform hover:-translate-y-0.5"
                    >
                      {payButtonLabel(p, t)}
                    </Link>
                  ) : (
                    <span className="log-label shrink-0 rounded-full bg-stone/15 px-3 py-1.5 text-stone">
                      {t.polls.closed}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
