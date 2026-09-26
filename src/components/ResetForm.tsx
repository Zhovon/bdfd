"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "@/app/actions";

export default function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(resetPassword, null);

  return (
    <form action={formAction} className="w-full max-w-sm">
      <input type="hidden" name="token" value={token} />
      <p className="log-label text-brand">Set a new password</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
        Reset password
      </h1>

      <label className="mt-8 block">
        <span className="log-label text-field">New password</span>
        <input
          name="password"
          type="password"
          autoFocus
          required
          className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none focus:border-brand"
        />
      </label>
      <label className="mt-6 block">
        <span className="log-label text-field">Confirm password</span>
        <input
          name="confirm"
          type="password"
          required
          className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none focus:border-brand"
        />
      </label>

      {state?.error && <p className="mt-4 text-sm text-grain">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-8 rounded-full bg-brand px-8 py-3.5 font-semibold text-husk transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
