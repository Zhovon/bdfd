import PostBoard from "@/components/PostBoard";
import Pagination from "@/components/Pagination";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPostsPaged } from "@/lib/content";
import { getModule } from "@/lib/site";

const mod = getModule("welfare")!;

export default async function WelfarePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const { page } = await searchParams;
  const { items, page: current, pageCount } = await listPostsPaged("welfare", Number(page) || 1);

  return (
    <div>
      <ModuleHeader mod={mod} />

      <h2 className="mt-8 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        Support notices
      </h2>
      <p className="mt-2 max-w-2xl text-stone">
        Notices about colleagues in need and welfare matters. Open any notice to read the details.
      </p>
      <div className="mt-4">
        <PostBoard posts={items} empty="No welfare notices right now." />
      </div>
      <Pagination page={current} pageCount={pageCount} basePath="/portal/welfare" />
    </div>
  );
}
