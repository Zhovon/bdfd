import Link from "next/link";
import type { PostCard } from "@/lib/content";
import { categoryMeta } from "@/lib/site";

const fmtDay = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "2-digit" }).format(new Date(d));
const fmtMon = (d: Date) => new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(d));
const isNew = (d: Date) => Date.now() - new Date(d).getTime() < 7 * 24 * 3600 * 1000;

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
            className="group flex flex-col overflow-hidden rounded-xl border border-line bg-husk transition-shadow hover:shadow-[0_8px_28px_-14px_rgba(10,59,44,0.4)]"
          >
            {/* Cover (or a colored placeholder band keyed to the category) */}
            <div className="relative aspect-[16/9] w-full overflow-hidden" style={{ backgroundColor: meta.tint }}>
              {p.cover ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.cover}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center font-[family-name:var(--font-display)] text-3xl font-bold opacity-30"
                  style={{ color: meta.accent }}
                >
                  {meta.label}
                </span>
              )}
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
              <span className="log-label mt-3 inline-flex items-center gap-1 text-brand">
                Read more <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
