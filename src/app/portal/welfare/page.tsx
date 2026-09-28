import PostBoard from "@/components/PostBoard";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPosts } from "@/lib/content";
import { getModule } from "@/lib/site";

const mod = getModule("welfare")!;

export default async function WelfarePage() {
  await requireUser();
  const posts = await listPosts("welfare");

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
        <PostBoard posts={posts} empty="No welfare notices right now." />
      </div>
    </div>
  );
}
