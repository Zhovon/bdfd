import PostBoard from "@/components/PostBoard";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPosts } from "@/lib/content";
import { donationTotals } from "@/lib/payments";
import { getModule } from "@/lib/site";

const mod = getModule("welfare")!;
const taka = (n: number) => `৳ ${n.toLocaleString("en-BD")}`;

export default async function WelfarePage() {
  await requireUser();
  const [posts, totals] = await Promise.all([
    listPosts("welfare"),
    donationTotals("donation"), // welfare fund = donations only, not tour fees
  ]);

  return (
    <div>
      <ModuleHeader mod={mod} />

      {/* Fund summary */}
      <div className="mt-6 inline-flex flex-wrap gap-6 rounded-lg border border-line bg-husk-deep px-6 py-4">
        <div>
          <p className="log-label">Verified fund</p>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-field tabular-nums">
            {taka(totals.verified)}
          </p>
        </div>
        <div>
          <p className="log-label">Awaiting verification</p>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-stone tabular-nums">
            {taka(totals.reported)}
          </p>
        </div>
      </div>

      {/* Appeals */}
      <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        Support appeals
      </h2>
      <p className="mt-2 max-w-2xl text-stone">
        Open any appeal to read the details and contribute — you choose the amount, and payment
        details are shown on each appeal&apos;s page.
      </p>
      <div className="mt-4">
        <PostBoard posts={posts} empty="No welfare appeals right now." />
      </div>
    </div>
  );
}
