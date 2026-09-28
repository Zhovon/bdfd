import Link from "next/link";
import type { PostCard } from "@/lib/content";
import { categoryMeta } from "@/lib/site";

const fmtDay = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "2-digit" }).format(new Date(d));
const fmtMon = (d: Date) => new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(d));
const isNew = (d: Date) => Date.now() - new Date(d).getTime() < 7 * 24 * 3600 * 1000;
const taka = (n: number) => `৳ ${n.toLocaleString("en-BD")}`;

/** Short label for a post's payment intent, or null if it takes no payment. */
function paymentLabel(p: PostCard): string | null {
  if (p.paymentMode === "participation") return p.feeAmount ? `Participate · ${taka(p.feeAmount)}` : "Participate";
  if (p.paymentMode === "donation") return "Open donation";
  return null;
}

/** Board list — each notice is a card linking to its full post. */
export default function PostBoard({
  posts,
  empty,
  showCategory = false,
}: {
  posts: PostCard[];
  empty?: string;
  showCategory?: boolean;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-10 text-center">
        <p className="text-stone">{empty ?? "Nothing posted here yet."}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {posts.map((p) => {
        const meta = categoryMeta(p.category);
        return (
          <Link
            key={p.id}
            href={`/portal/notice/${p.id}`}
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
                  {meta.label}
                </span>
              )}
              {/* Legibility scrim, deepened on hover */}
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-field/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                aria-hidden
              />
              {p.photoCount > 1 && (
                <span className="log-label absolute bottom-2 right-2 rounded-full bg-field/80 px-2 py-1 text-husk">
                  {p.photoCount} photos
                </span>
              )}
              {isNew(p.created_at) && (
                <span className="log-label absolute left-2 top-2 rounded-full bg-grain px-2.5 py-1 text-husk">
                  New
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center gap-2">
                {showCategory && (
                  <span className="log-label" style={{ color: meta.accent }}>
                    {meta.label}
                  </span>
                )}
                <span className="log-label text-stone">
                  {fmtDay(p.created_at)} {fmtMon(p.created_at)}
                </span>
              </div>
              <h3 className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-bold leading-snug text-field">
                {p.title}
              </h3>
              {p.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone">{p.excerpt}</p>}
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="log-label inline-flex items-center gap-1 text-brand">
                  Read more <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
                {(() => {
                  const label = paymentLabel(p);
                  if (!label) return null;
                  return (
                    <span
                      className={`log-label rounded-full px-2.5 py-1 ${
                        p.paymentOpen ? "bg-brand/10 text-brand" : "bg-stone/15 text-stone"
                      }`}
                    >
                      {p.paymentOpen ? label : "Closed"}
                    </span>
                  );
                })()}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
