import Link from "next/link";
import { notFound } from "next/navigation";
import Gallery from "@/components/Gallery";
import { requireUser } from "@/lib/session";
import { getPost } from "@/lib/content";
import { getModule, categoryMeta } from "@/lib/site";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d));

export default async function NoticePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const post = await getPost(Number(id));
  if (!post) notFound();

  const mod = getModule(post.category);
  const meta = categoryMeta(post.category);

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href={`/portal/${post.category}`}
        className="log-label inline-flex items-center gap-1 text-stone transition-colors hover:text-field"
      >
        ← {mod?.title ?? "Back"}
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <span
          className="log-label rounded-full px-2.5 py-1"
          style={{ backgroundColor: meta.tint, color: meta.accent }}
        >
          {meta.label}
        </span>
        <span className="log-label text-stone">{fmt(post.created_at)}</span>
      </div>

      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold leading-tight text-field">
        {post.title}
      </h1>
      {post.excerpt && <p className="mt-3 text-lg leading-relaxed text-stone">{post.excerpt}</p>}

      {post.cover.length > 0 && <Gallery images={post.cover} title={post.title} />}

      {/* Sections */}
      {post.blocks.length > 0 ? (
        <div className="mt-8 grid gap-10">
          {post.blocks.map((b, i) => (
            <section key={b.id}>
              {b.heading && (
                <h2 className="flex items-baseline gap-3 font-[family-name:var(--font-display)] text-2xl font-bold text-field">
                  <span className="log-label" style={{ color: meta.accent }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {b.heading}
                </h2>
              )}
              {b.body && (
                <p className="mt-3 whitespace-pre-line leading-relaxed text-field/85">{b.body}</p>
              )}
              {b.images.length > 0 && <Gallery images={b.images} title={b.heading ?? post.title} />}
            </section>
          ))}
        </div>
      ) : (
        // Legacy posts with a single body and no sections.
        post.body && (
          <p className="mt-8 whitespace-pre-line leading-relaxed text-field/85">{post.body}</p>
        )
      )}
    </article>
  );
}
