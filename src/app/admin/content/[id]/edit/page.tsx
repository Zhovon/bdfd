import Link from "next/link";
import { notFound } from "next/navigation";
import PostEditor from "@/components/PostEditor";
import { requireStaff } from "@/lib/session";
import { getPostForEdit } from "@/lib/content";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const postId = Number(id);
  const post = await getPostForEdit(postId);
  if (!post) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/content"
        className="log-label link-underline inline-flex text-stone transition-colors hover:text-field"
      >
        ← Back to content
      </Link>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold text-field">
        Edit notice
      </h2>
      <div className="mt-5">
        <PostEditor
          initial={{
            id: post.id,
            category: post.category,
            title: post.title,
            excerpt: post.excerpt,
            videos: post.videos,
            paymentMode: post.paymentMode,
            feeAmount: post.feeAmount,
            pdfUrl: post.pdfUrl,
            cover: post.cover,
            blocks: post.blocks,
          }}
        />
      </div>
    </div>
  );
}
