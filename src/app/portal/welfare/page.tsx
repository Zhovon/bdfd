import PostBoard from "@/components/PostBoard";
import Pagination from "@/components/Pagination";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPostsPaged } from "@/lib/content";
import { getModule } from "@/lib/site";
import { getDict } from "@/lib/i18n";

const mod = getModule("welfare")!;

export default async function WelfarePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { page } = await searchParams;
  const [t, { items, page: current, pageCount }] = await Promise.all([
    getDict(),
    listPostsPaged("welfare", Number(page) || 1),
  ]);

  return (
    <div>
      <ModuleHeader mod={mod} />

      <h2 className="mt-8 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        {t.boardsPage.supportNotices}
      </h2>
      <p className="mt-2 max-w-2xl text-stone">{t.boardsPage.welfareIntro}</p>
      <div className="mt-4">
        <PostBoard posts={items} empty={t.boardsPage.noWelfare} />
      </div>
      <Pagination page={current} pageCount={pageCount} basePath="/portal/welfare" />
    </div>
  );
}
