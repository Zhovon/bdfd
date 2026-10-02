"use client";

import { useActionState } from "react";
import { submitKeepingInput } from "@/lib/forms";
import Link from "next/link";
import { login, type LoginState } from "@/app/actions";
import PasswordInput from "@/components/PasswordInput";
import { useI18n } from "@/components/I18nProvider";

export default function LoginForm({ notice }: { notice?: string }) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, null);

  return (
    <form action={formAction} onSubmit={submitKeepingInput(formAction)} className="w-full max-w-sm">
      <p className="log-label text-brand">{t.auth.members}</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
        {t.auth.logIn}
      </h1>
      <p className="mt-2 text-sm text-stone">{t.auth.loginSubtitle}</p>
      {notice && (
        <p className="mt-4 rounded-lg border border-brand bg-brand/5 px-4 py-3 text-sm text-brand">
          {notice}
        </p>
      )}

      <label className="mt-8 block">
        <span className="log-label text-field">{t.auth.email}</span>
        <input
          name="email"
          type="text"
          autoFocus
          autoComplete="username"
          className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none transition-colors focus:border-brand"
        />
      </label>

      <label className="mt-6 block">
        <span className="flex items-center justify-between">
          <span className="log-label text-field">{t.auth.password}</span>
          <Link href="/forgot" className="log-label text-brand hover:underline">
            {t.auth.forgotShort}
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
        {pending ? t.auth.checking : t.auth.logIn}
      </button>

      <p className="mt-6 text-sm text-stone">
        {t.auth.notRegistered}{" "}
        <Link href="/register" className="font-semibold text-brand underline-offset-2 hover:underline">
          {t.auth.createAccount}
        </Link>
      </p>
    </form>
  );
}
