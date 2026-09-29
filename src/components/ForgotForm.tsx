"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotState } from "@/app/actions";
import Turnstile from "@/components/Turnstile";
import { useI18n } from "@/components/I18nProvider";

export default function ForgotForm({ siteKey }: { siteKey: string }) {
  const f = useI18n().t.forgot;
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, null);

  if (state?.done) {
    return (
      <div className="w-full max-w-sm">
        <p className="log-label text-brand">{f.checkEmail}</p>
        <p className="mt-3 text-field">{state.message}</p>
        <Link href="/login" className="mt-6 inline-block font-semibold text-brand hover:underline">
          {f.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-sm">
      <p className="log-label text-brand">{f.kicker}</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
        {f.title}
      </h1>
      <p className="mt-2 text-sm text-stone">{f.subtitle}</p>

      <label className="mt-8 block">
        <span className="log-label text-field">{f.email}</span>
        <input
          name="email"
          type="email"
          autoFocus
          required
          className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none focus:border-brand"
        />
      </label>

      <div className="mt-6">
        <Turnstile siteKey={siteKey} resetKey={state} />
      </div>
      {state && !state.done && <p className="mt-4 text-sm text-grain">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-8 rounded-full bg-brand px-8 py-3.5 font-semibold text-husk transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? f.sending : f.send}
      </button>
      <p className="mt-6 text-sm text-stone">
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {f.backToLogin}
        </Link>
      </p>
    </form>
  );
}
