import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PaymentForm from "@/components/PaymentForm";
import { requireUser } from "@/lib/session";
import { acceptsPayment, getPost } from "@/lib/content";
import { listPaymentMethods, postTotals } from "@/lib/payments";
import { getDict } from "@/lib/i18n";

const taka = (n: number) => `৳ ${n.toLocaleString("en-BD")}`;

export default async function PayPage({ params }: { params: Promise<{ postId: string }> }) {
  await requireUser();
  const { postId } = await params;
  const post = await getPost(Number(postId));
  if (!post) notFound();
  // Nothing to pay on an informational notice — send the reader back to it.
  if (!acceptsPayment(post)) redirect(`/portal/notice/${post.id}`);

  const isTour = post.paymentMode === "participation";
  const [methods, totals, dict] = await Promise.all([listPaymentMethods(true), postTotals(post.id), getDict()]);
  const t = dict.pay;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/portal/notice/${post.id}`}
        className="log-label inline-flex items-center gap-1 text-stone transition-colors hover:text-field"
      >
        {t.backToNotice}
      </Link>

      <p className="log-label mt-4 text-brand">{isTour ? t.tourParticipation : t.contribution}</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-field">
        {post.title}
      </h1>

      {!post.paymentOpen ? (
        <div className="mt-8 rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-stone">{isTour ? t.closedTour : t.closed}</p>
        </div>
      ) : (
        <>
          {/* Amount context */}
          <div className="mt-6 rounded-xl border border-line bg-husk-deep px-6 py-5">
            {isTour ? (
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="log-label">{t.feePerPerson}</p>
                  <p className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-field">
                    {taka(post.feeAmount ?? 0)}
                  </p>
                </div>
                {totals.count > 0 && (
                  <p className="log-label text-stone">
                    {totals.count} {t.alreadyRegistered}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="log-label">{t.giveAny}</p>
                  <p className="text-field">{t.everyHelps}</p>
                </div>
                {totals.verified > 0 && (
                  <div className="text-right">
                    <p className="log-label">{t.raisedSoFar}</p>
                    <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-field">
                      {taka(totals.verified)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 1 — pay to an account */}
          <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl font-bold text-field">
            {t.step1}
          </h2>
          <p className="mt-2 max-w-2xl text-stone">{t.step1Intro}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {methods.map((m) => (
              <div key={m.id} className="rounded-xl border border-line p-5">
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

          {/* Step 2 — report it */}
          <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl font-bold text-field">
            {t.step2}
          </h2>
          <div className="mt-5">
            <PaymentForm
              postId={post.id}
              kind={isTour ? "participation" : "donation"}
              fee={post.feeAmount}
              methods={methods.map((m) => m.label)}
            />
          </div>
        </>
      )}
    </div>
  );
}
