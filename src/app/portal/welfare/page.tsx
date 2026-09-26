import PostBoard from "@/components/PostBoard";
import DonationForm from "@/components/DonationForm";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPosts } from "@/lib/content";
import { listPaymentMethods, donationTotals } from "@/lib/payments";
import { getModule } from "@/lib/site";

const mod = getModule("welfare")!;
const taka = (n: number) => `৳ ${n.toLocaleString("en-BD")}`;

export default async function WelfarePage() {
  await requireUser();
  const [posts, methods, totals] = await Promise.all([
    listPosts("welfare"),
    listPaymentMethods(true),
    donationTotals(),
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

      {/* Notices */}
      <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        Support notices
      </h2>
      <div className="mt-4">
        <PostBoard posts={posts} empty="No welfare notices right now." />
      </div>

      {/* Manual payment gateway */}
      <h2 className="mt-12 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        How to donate
      </h2>
      <p className="mt-2 max-w-2xl text-stone">
        Send your contribution using any option below, then record it in the form so the
        administration can verify and acknowledge it.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {methods.map((m) => (
          <div key={m.id} className="rounded-lg border border-line p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-field">{m.label}</span>
              <span className="log-label rounded-full bg-brand/10 px-2.5 py-1 text-brand">{m.kind}</span>
            </div>
            <p className="mt-3 font-[family-name:var(--font-mono)] text-lg font-bold tracking-wide text-field">
              {m.account_number}
            </p>
            <p className="text-sm text-stone">{m.account_name}</p>
            {m.instructions && <p className="mt-2 text-sm text-stone">{m.instructions}</p>}
          </div>
        ))}
      </div>

      {/* Report donation */}
      <div className="mt-8">
        <DonationForm methods={methods.map((m) => m.label)} />
      </div>
    </div>
  );
}
