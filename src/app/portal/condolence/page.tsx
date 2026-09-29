import PostBoard from "@/components/PostBoard";
import Pagination from "@/components/Pagination";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPostsPaged } from "@/lib/content";
import { getModule } from "@/lib/site";
import { getDict } from "@/lib/i18n";

const mod = getModule("condolence")!;

export default async function CondolencePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { page } = await searchParams;
  const [t, { items, page: current, pageCount }] = await Promise.all([
    getDict(),
    listPostsPaged("condolence", Number(page) || 1),
  ]);
  return (
    <div>
      <ModuleHeader mod={mod} />
      <div className="mt-8">
        <PostBoard posts={items} empty={t.boardsPage.noCondolence} />
      </div>
      <Pagination page={current} pageCount={pageCount} basePath="/portal/condolence" />
    </div>
  );
}
