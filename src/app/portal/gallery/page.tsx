import PostBoard from "@/components/PostBoard";
import Pagination from "@/components/Pagination";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPostsPaged } from "@/lib/content";
import { getModule } from "@/lib/site";
import { getDict } from "@/lib/i18n";

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
    listPostsPaged("gallery", Number(page) || 1),
  ]);

  return (
    <div>
      <ModuleHeader mod={mod} />

      <h2 className="mt-8 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        {t.boards.gallery.title}
      </h2>
      <p className="mt-2 max-w-2xl text-stone">{t.boards.gallery.blurb}</p>
      <div className="mt-4">
        <PostBoard posts={items} empty={t.card.nothingPosted} />
      </div>
      <Pagination page={current} pageCount={pageCount} basePath="/portal/gallery" />
    </div>
  );
}
