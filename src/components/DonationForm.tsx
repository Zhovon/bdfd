"use client";

import { useActionState } from "react";
import { reportDonation, type DonationState } from "@/app/portal/actions";

export default function DonationForm({ methods }: { methods: string[] }) {
  const [state, formAction, pending] = useActionState<DonationState, FormData>(reportDonation, null);

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-brand bg-husk p-6">
        <p className="log-label text-brand">Recorded</p>
        <p className="mt-2 text-field">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5 rounded-lg border border-line bg-husk p-6 sm:grid-cols-2">
      <p className="log-label sm:col-span-2 text-field">Report a donation you&apos;ve made</p>

      <label>
        <span className="log-label text-field">Amount (৳)</span>
        <input
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none focus:border-brand"
        />
      </label>
      <label>
        <span className="log-label text-field">Paid via</span>
        <select
          name="method"
          required
          defaultValue=""
          className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none focus:border-brand"
        >
          <option value="" disabled>
            Select…
          </option>
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="log-label text-field">Transaction ID / reference</span>
        <input
          name="transactionRef"
          required
          placeholder="e.g. bKash TrxID"
          className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none placeholder:text-stone/50 focus:border-brand"
        />
      </label>
      <label className="sm:col-span-2">
        <span className="log-label text-field">Note (optional)</span>
        <input
          name="note"
          className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none focus:border-brand"
        />
      </label>

      <div className="flex items-center gap-4 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-8 py-3 font-semibold text-husk transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? "Recording…" : "Record my donation"}
        </button>
        {state && !state.ok && <span className="text-sm text-grain">{state.message}</span>}
      </div>
    </form>
  );
}
