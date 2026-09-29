import PostBoard from "@/components/PostBoard";
import Pagination from "@/components/Pagination";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPostsPaged } from "@/lib/content";
import { getModule } from "@/lib/site";

const mod = getModule("condolence")!;

export default async function CondolencePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { page } = await searchParams;
  const { items, page: current, pageCount } = await listPostsPaged("condolence", Number(page) || 1);
  return (
    <div>
      <ModuleHeader mod={mod} />
      <div className="mt-8">
        <PostBoard posts={items} empty="No posts here yet." />
      </div>
      <Pagination page={current} pageCount={pageCount} basePath="/portal/condolence" />
    </div>
  );
}
