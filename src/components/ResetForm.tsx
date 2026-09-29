"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "@/app/actions";
import PasswordInput from "@/components/PasswordInput";
import { useI18n } from "@/components/I18nProvider";

export default function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(resetPassword, null);
  const r = useI18n().t.reset;

  return (
    <form action={formAction} className="w-full max-w-sm">
      <input type="hidden" name="token" value={token} />
      <p className="log-label text-brand">{r.kicker}</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
        {r.title}
      </h1>

      <label className="mt-8 block">
        <span className="log-label text-field">{r.newPassword}</span>
        <PasswordInput name="password" autoFocus required autoComplete="new-password" />
      </label>
      <label className="mt-6 block">
        <span className="log-label text-field">{r.confirm}</span>
        <PasswordInput name="confirm" required autoComplete="new-password" />
      </label>

      {state?.error && <p className="mt-4 text-sm text-grain">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-8 rounded-full bg-brand px-8 py-3.5 font-semibold text-husk transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? r.saving : r.submit}
      </button>
    </form>
  );
}
