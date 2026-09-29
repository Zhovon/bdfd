import Link from "next/link";
import { notFound } from "next/navigation";
import PostMedia from "@/components/PostMedia";
import SectionGallery from "@/components/SectionGallery";
import PaymentCTA from "@/components/PaymentCTA";
import { requireUser } from "@/lib/session";
import { acceptsPayment, getPost } from "@/lib/content";
import { postTotals } from "@/lib/payments";
import { categoryMeta } from "@/lib/site";
import { getDict } from "@/lib/i18n";

const fmt = (d: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d));

export default async function NoticePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const t = await getDict();
  const post = await getPost(Number(id));
  if (!post) notFound();

  const board = t.boards[post.category as keyof typeof t.boards];
  const meta = categoryMeta(post.category);
  const totals = acceptsPayment(post) ? await postTotals(post.id) : null;

  // The cover gallery (plus any videos) sits between the title and the body;
  // each section below carries its own separate gallery.
  const photos = post.cover;
  // Sections that carry text or their own photos.
  const textBlocks = post.blocks.filter((b) => b.heading || b.body || b.images.length > 0);

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href={`/portal/${post.category}`}
        className="log-label link-underline inline-flex items-center gap-1 text-stone transition-colors hover:text-field"
      >
        ← {board?.title ?? t.common.back}
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <span
          className="log-label rounded-full px-2.5 py-1"
          style={{ backgroundColor: meta.tint, color: meta.accent }}
        >
          {board?.label ?? post.category}
        </span>
        <span className="log-label text-stone">{fmt(post.created_at, t.intl)}</span>
      </div>

      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.05] tracking-tight text-field sm:text-5xl">
        {post.title}
      </h1>
      {post.excerpt && <p className="mt-3 text-lg leading-relaxed text-stone">{post.excerpt}</p>}

      {totals && <PaymentCTA post={post} totals={totals} />}

      {/* Main image + gallery button (photos & videos) between title and body */}
      <PostMedia images={photos} videos={post.videos} title={post.title} />

      <hr className="rule mt-10" />

      {/* Body text */}
      {textBlocks.length > 0 ? (
        <div className="mt-10 grid gap-10">
          {textBlocks.map((b, i) => (
            <section key={b.id} className={i > 0 ? "border-t border-line pt-10" : ""}>
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
              {/* This section's own gallery — its viewer pages through only these photos */}
              <SectionGallery
                images={b.images}
                title={b.heading || `${post.title} · ${String(i + 1).padStart(2, "0")}`}
              />
            </section>
          ))}
        </div>
      ) : (
        // Legacy posts with a single body and no sections.
        post.body && (
          <p className="mt-8 whitespace-pre-line leading-relaxed text-field/85">{post.body}</p>
        )
      )}

      {/* Programme PDF — embedded viewer + download, after the body */}
      {post.pdfUrl && (
        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-field">
              {t.notice.programmeDetails}
            </h2>
            <a
              href={post.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-2 rounded-full border border-field/30 px-5 py-2.5 text-sm font-semibold text-field transition-colors hover:bg-field hover:text-husk"
            >
              {t.notice.downloadPdf}
            </a>
          </div>
          <iframe
            src={post.pdfUrl}
            title={`${post.title} programme`}
            className="mt-4 h-[80vh] w-full rounded-xl border border-line"
          />
        </section>
      )}
    </article>
  );
}
