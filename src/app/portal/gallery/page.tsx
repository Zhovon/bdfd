import Link from "next/link";
import Pagination from "@/components/Pagination";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { getGalleryImagesPaged } from "@/lib/content";
import { getModule, categoryMeta } from "@/lib/site";
import { getDict } from "@/lib/i18n";
import { thumbUrl } from "@/lib/media";

const mod = getModule("gallery")!;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { page } = await searchParams;
  const [t, { items, page: current, pageCount }] = await Promise.all([
    getDict(),
    getGalleryImagesPaged(Number(page) || 1),
  ]);

  return (
    <div>
      <ModuleHeader mod={mod} />

      <h2 className="mt-8 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        {t.boards.gallery.title}
      </h2>
      <p className="mt-2 max-w-2xl text-stone">{t.boards.gallery.blurb}</p>

      {items.length === 0 ? (
        <div className="mt-12 text-center text-stone">{t.card.nothingPosted}</div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((img, i) => {
            const meta = categoryMeta(img.postCategory);
            return (
              <Link
                key={`${img.postId}-${i}`}
                href={`/portal/notice/${img.postId}`}
                className="group relative block aspect-square overflow-hidden rounded-xl bg-field/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl(img.url)}
                  alt={img.postTitle}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span
                    className="text-[0.65rem] font-bold uppercase tracking-wider"
                    style={{ color: meta.accent }}
                  >
                    {t.boards[img.postCategory]?.label || meta.label}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-xs font-medium text-white shadow-black drop-shadow-md">
                    {img.postTitle}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination page={current} pageCount={pageCount} basePath="/portal/gallery" />
    </div>
  );
}
