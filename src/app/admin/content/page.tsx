import Link from "next/link";
import { listAllPostsPaged } from "@/lib/content";
import { removePost } from "../actions";
import PostEditor from "@/components/PostEditor";
import Pagination from "@/components/Pagination";
import { categoryMeta } from "@/lib/site";
import ConfirmButton from "@/components/ConfirmButton";
import { getDict } from "@/lib/i18n";

const fmt = (d: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));

export default async function AdminContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const [{ items: posts, total, page: current, pageCount }, dict] = await Promise.all([
    listAllPostsPaged(Number(page) || 1),
    getDict(),
  ]);
  const t = dict.adminUi;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
      {/* Create */}
      <div className="min-w-0">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-field">
          {dict.editor.newPost}
        </h2>
        <p className="mt-2 text-sm text-stone">{t.contentIntro}</p>
        <div className="mt-5">
          <PostEditor />
        </div>
      </div>

      {/* List */}
      <div className="min-w-0">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-field">
          {dict.editor.posted} <span className="text-stone">({total})</span>
        </h2>
        <ul className="mt-5 grid gap-3">
          {posts.map((p) => {
            const meta = categoryMeta(p.category);
            const label = dict.boards[p.category as keyof typeof dict.boards]?.label ?? meta.label;
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
                        {label}
                      </span>
                      <span className="log-label text-stone">{fmt(p.created_at, dict.intl)}</span>
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
                    {t.edit}
                  </Link>
                  <form action={removePost}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmButton
                      message={t.confirmDeletePost}
                      className="log-label text-stone hover:text-grain hover:underline"
                    >
                      {t.delete}
                    </ConfirmButton>
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
