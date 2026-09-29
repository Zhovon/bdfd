import Link from "next/link";
import { listAllPostsPaged } from "@/lib/content";
import { removePost } from "../actions";
import PostEditor from "@/components/PostEditor";
import Pagination from "@/components/Pagination";
import { categoryMeta } from "@/lib/site";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));

export default async function AdminContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const { items: posts, total, page: current, pageCount } = await listAllPostsPaged(Number(page) || 1);
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
      {/* Create */}
      <div className="min-w-0">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-field">
          New post / notice
        </h2>
        <p className="mt-2 text-sm text-stone">
          Add a title and summary, then build the story in sections — each with its own heading, text
          and photos (e.g. Day 1, Day 2, Day 3).
        </p>
        <div className="mt-5">
          <PostEditor />
        </div>
      </div>

      {/* List */}
      <div className="min-w-0">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-field">
          Posted <span className="text-stone">({total})</span>
        </h2>
        <ul className="mt-5 grid gap-3">
          {posts.map((p) => {
            const meta = categoryMeta(p.category);
            return (
              <li key={p.id} className="flex items-start justify-between gap-4 rounded-lg border border-line p-4">
                <div className="flex min-w-0 gap-3">
                  {p.cover && (
                    <span className="relative h-14 w-14 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.cover} alt="" className="h-14 w-14 rounded-md object-cover" />
                      {p.photoCount > 1 && (
                        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-field px-1 text-[0.6rem] font-bold text-husk">
                          {p.photoCount}
                        </span>
                      )}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="log-label" style={{ color: meta.accent }}>
                        {meta.label}
                      </span>
                      <span className="log-label text-stone">{fmt(p.created_at)}</span>
                    </div>
                    <Link
                      href={`/portal/notice/${p.id}`}
                      className="mt-1 block font-semibold text-field hover:underline"
                    >
                      {p.title}
                    </Link>
                    {p.excerpt && <p className="mt-0.5 line-clamp-2 text-sm text-stone">{p.excerpt}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/admin/content/${p.id}/edit`}
                    className="log-label text-brand hover:underline"
                  >
                    Edit
                  </Link>
                  <form action={removePost}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="log-label text-stone hover:text-grain hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
        <Pagination page={current} pageCount={pageCount} basePath="/admin/content" />
      </div>
    </div>
  );
}
