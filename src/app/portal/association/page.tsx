import PostBoard from "@/components/PostBoard";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPosts } from "@/lib/content";
import { getModule } from "@/lib/site";

const mod = getModule("association")!;

export default async function AssociationPage() {
  await requireUser();
  const posts = await listPosts("association");
  return (
    <div>
      <ModuleHeader mod={mod} />
      <div className="mt-8">
        <PostBoard posts={posts} empty="No association notices yet." />
      </div>
    </div>
  );
}
