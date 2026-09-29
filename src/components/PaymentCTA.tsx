import Link from "next/link";
import type { Post } from "@/lib/content";
import type { ContributionTotals } from "@/lib/payments";
import { getDict } from "@/lib/i18n";

const taka = (n: number) => `৳ ${n.toLocaleString("en-BD")}`;

/**
 * The call-to-action panel on a notice that accepts payments. Renders nothing
 * for informational notices. A fixed-fee tour shows the fee + a Participate
 * button; an open-amount notice shows the amount raised + a Donate button.
 */
export default async function PaymentCTA({ post, totals }: { post: Post; totals: ContributionTotals }) {
  if (post.paymentMode === "none") return null;
  const isTour = post.paymentMode === "participation";
  const dict = await getDict();
  const t = dict.pay;

  return (
    <div className="mt-6 rounded-2xl border border-brand/25 bg-husk-deep p-6 shadow-[0_10px_30px_-18px_rgba(10,59,44,0.5)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="log-label text-brand">{isTour ? t.joinTour : t.supportThis}</p>
          {isTour ? (
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-field">
              {taka(post.feeAmount ?? 0)}
              <span className="ml-2 align-middle text-sm font-normal text-stone">{dict.payments.perPerson}</span>
            </p>
          ) : (
            <p className="mt-1 text-field">
              {totals.verified > 0 ? (
                <>
                  <span className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-field">
                    {taka(totals.verified)}
                  </span>
                  <span className="ml-2 align-middle text-sm text-stone">{dict.payments.raised}</span>
                </>
              ) : (
                t.beFirst
              )}
            </p>
          )}
        </div>

        {post.paymentOpen ? (
          <Link
            href={`/portal/pay/${post.id}`}
            className="group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 font-semibold text-husk transition-transform hover:-translate-y-0.5"
          >
            {isTour ? dict.payments.participate : dict.payments.donate}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        ) : (
          <span className="log-label rounded-full bg-stone/15 px-4 py-2 text-stone">
            {isTour ? t.bookingsClosed : dict.polls.closed}
          </span>
        )}
      </div>
    </div>
  );
}
