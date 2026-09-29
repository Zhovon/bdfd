"use client";

import { useActionState, useState } from "react";
import { reportDonation, type DonationState } from "@/app/portal/actions";
import { useI18n } from "@/components/I18nProvider";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
const taka = (n: number) => `৳ ${n.toLocaleString("en-BD")}`;

/**
 * The report-your-payment form on a post's payment page. For a tour the amount
 * is fixed to the post's fee; for an open donation the member picks any amount.
 * Kind and the participation amount are re-derived server-side — the hidden
 * fields here are only a convenience, never trusted.
 */
export default function PaymentForm({
  postId,
  kind,
  fee,
  methods,
}: {
  postId: number;
  kind: "participation" | "donation";
  fee: number | null;
  methods: string[];
}) {
  const [state, formAction, pending] = useActionState<DonationState, FormData>(reportDonation, null);
  const [amount, setAmount] = useState<string>(kind === "participation" && fee ? String(fee) : "");
  const t = useI18n().t.pay;

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-brand bg-husk p-6">
        <p className="log-label text-brand">{t.recorded}</p>
        <p className="mt-2 text-field">{state.message}</p>
      </div>
    );
  }

  const isTour = kind === "participation";
  const underline =
    "mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none focus:border-brand";

  return (
    <form action={formAction} className="grid gap-5 rounded-xl border border-line bg-husk p-6 sm:grid-cols-2">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="kind" value={kind} />

      <p className="log-label text-field sm:col-span-2">
        {isTour ? t.confirmTitle : t.reportTitle}
      </p>

      {isTour ? (
        <div className="sm:col-span-2">
          <span className="log-label text-field">{t.amountDue}</span>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-field">
            {taka(fee ?? 0)}
          </p>
          <input type="hidden" name="amount" value={fee ?? 0} />
        </div>
      ) : (
        <div className="sm:col-span-2">
          <span className="log-label text-field">{t.amountTk}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((q) => {
              const active = amount === String(q);
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold tabular-nums transition-colors ${
                    active
                      ? "border-brand bg-brand text-husk"
                      : "border-line text-field hover:border-brand"
                  }`}
                >
                  {taka(q)}
                </button>
              );
            })}
          </div>
          <input
            name="amount"
            type="number"
            min="1"
            step="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t.otherAmount}
            className={`${underline} placeholder:text-stone/50`}
          />
        </div>
      )}

      <label>
        <span className="log-label text-field">{t.paidVia}</span>
        <select name="method" required defaultValue="" className={underline}>
          <option value="" disabled>
            {t.select}
          </option>
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="log-label text-field">{t.txnRef}</span>
        <input
          name="transactionRef"
          required
          placeholder={t.txnPlaceholder}
          className={`${underline} placeholder:text-stone/50`}
        />
      </label>
      <label className="sm:col-span-2">
        <span className="log-label text-field">{t.note}</span>
        <input name="note" className={underline} />
      </label>

      <div className="flex items-center gap-4 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-8 py-3 font-semibold text-husk transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? t.recording : isTour ? t.confirmPayment : t.recordDonation}
        </button>
        {state && !state.ok && <span className="text-sm text-grain">{state.message}</span>}
      </div>
    </form>
  );
}
