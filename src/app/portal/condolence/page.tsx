import PostBoard from "@/components/PostBoard";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPosts } from "@/lib/content";
import { getModule } from "@/lib/site";

const mod = getModule("condolence")!;

export default async function CondolencePage() {
  await requireUser();
  const posts = await listPosts("condolence");
  return (
    <div>
      <ModuleHeader mod={mod} />
      <div className="mt-8">
        <PostBoard posts={posts} empty="No posts here yet." />
      </div>
    </div>
  );
}
