"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "@/app/actions";
import PasswordInput from "@/components/PasswordInput";

export default function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, null);

  return (
    <form action={formAction} className="w-full max-w-sm">
      <p className="log-label text-brand">Members</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
        Log in
      </h1>
      <p className="mt-2 text-sm text-stone">For approved departmental officers only.</p>
      {notice && (
        <p className="mt-4 rounded-lg border border-brand bg-brand/5 px-4 py-3 text-sm text-brand">
          {notice}
        </p>
      )}

      <label className="mt-8 block">
        <span className="log-label text-field">Official email</span>
        <input
          name="email"
          type="email"
          autoFocus
          autoComplete="username"
          className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none transition-colors focus:border-brand"
        />
      </label>

      <label className="mt-6 block">
        <span className="flex items-center justify-between">
          <span className="log-label text-field">Password</span>
          <Link href="/forgot" className="log-label text-brand hover:underline">
            Forgot?
          </Link>
        </span>
        <PasswordInput name="password" autoComplete="current-password" />
      </label>

      {state?.error && <p className="mt-4 text-sm text-grain">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-8 rounded-full bg-brand px-8 py-3.5 font-semibold text-husk transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Checking…" : "Log in"}
      </button>

      <p className="mt-6 text-sm text-stone">
        Not registered yet?{" "}
        <Link href="/register" className="font-semibold text-brand underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
