import PostBoard from "@/components/PostBoard";
import Pagination from "@/components/Pagination";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPostsPaged } from "@/lib/content";
import { getModule } from "@/lib/site";

const mod = getModule("association")!;

export default async function AssociationPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { page } = await searchParams;
  const { items, page: current, pageCount } = await listPostsPaged("association", Number(page) || 1);
  return (
    <div>
      <ModuleHeader mod={mod} />
      <div className="mt-8">
        <PostBoard posts={items} empty="No association notices yet." />
      </div>
      <Pagination page={current} pageCount={pageCount} basePath="/portal/association" />
    </div>
  );
}
