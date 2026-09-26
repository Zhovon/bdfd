"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotState } from "@/app/actions";

export default function ForgotForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, null);

  if (state?.done) {
    return (
      <div className="w-full max-w-sm">
        <p className="log-label text-brand">Check your email</p>
        <p className="mt-3 text-field">{state.message}</p>
        <Link href="/login" className="mt-6 inline-block font-semibold text-brand hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-sm">
      <p className="log-label text-brand">Recover access</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
        Forgot password
      </h1>
      <p className="mt-2 text-sm text-stone">Enter your official email and we&apos;ll send a reset link.</p>

      <label className="mt-8 block">
        <span className="log-label text-field">Official email</span>
        <input
          name="email"
          type="email"
          autoFocus
          required
          className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none focus:border-brand"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-8 rounded-full bg-brand px-8 py-3.5 font-semibold text-husk transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="mt-6 text-sm text-stone">
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
