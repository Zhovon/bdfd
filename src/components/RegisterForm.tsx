"use client";

import { useActionState } from "react";
import { submitKeepingInput } from "@/lib/forms";
import { registerUser, type RegisterState } from "@/app/actions";
import Turnstile from "@/components/Turnstile";
import PasswordInput from "@/components/PasswordInput";
import { useI18n } from "@/components/I18nProvider";

type Key =
  | "fullName"
  | "officialEmail"
  | "mobile"
  | "serviceId"
  | "designation"
  | "posting"
  | "password"
  | "confirm";

type Labels = ReturnType<typeof useI18n>["t"]["register"];

const fields: { key: Key; label: keyof Labels; type?: string; full?: boolean; hint?: keyof Labels }[] = [
  { key: "fullName", label: "fullName", full: true },
  { key: "officialEmail", label: "email", type: "email" },
  { key: "mobile", label: "mobile", type: "tel" },
  { key: "serviceId", label: "serviceId" },
  { key: "designation", label: "designation" },
  { key: "posting", label: "posting", full: true },
  { key: "password", label: "password", type: "password", hint: "passwordHint" },
  { key: "confirm", label: "confirm", type: "password" },
];

export default function RegisterForm({ siteKey }: { siteKey: string }) {
  const { t } = useI18n();
  const r = t.register;
  const [state, formAction, pending] = useActionState<RegisterState | null, FormData>(
    registerUser,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-brand bg-husk-deep p-8">
        <p className="log-label text-brand">{r.received}</p>
        <p className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold text-field">
          {r.awaiting}
        </p>
        <p className="mt-2 text-stone">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={submitKeepingInput(formAction)} className="grid gap-6 sm:grid-cols-2">
      {fields.map((f) => (
        <label key={f.key} className={f.full ? "sm:col-span-2" : ""}>
          <span className="log-label flex items-center gap-2 text-field">
            {r[f.label]}
            {f.hint && <span className="text-stone">· {r[f.hint]}</span>}
          </span>
          {f.type === "password" ? (
            <PasswordInput
              name={f.key}
              required
              autoComplete="new-password"
              aria-invalid={Boolean(state?.fieldErrors?.[f.key])}
            />
          ) : (
            <input
              name={f.key}
              type={f.type ?? "text"}
              required
              autoComplete="off"
              className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none transition-colors focus:border-brand"
              aria-invalid={Boolean(state?.fieldErrors?.[f.key])}
            />
          )}
          {state?.fieldErrors?.[f.key] && (
            <span className="mt-1 block text-sm text-grain">{state.fieldErrors[f.key]}</span>
          )}
        </label>
      ))}

      <div className="sm:col-span-2">
        <span className="log-label mb-2 block text-field">{r.verifyHuman}</span>
        <Turnstile siteKey={siteKey} resetKey={state} />
        {state?.fieldErrors?.captcha && (
          <span className="mt-1 block text-sm text-grain">{state.fieldErrors.captcha}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-8 py-3.5 font-semibold text-husk transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? r.submitting : r.submit}
        </button>
        {state && !state.ok && !state.fieldErrors && (
          <span className="text-sm text-grain">{state.message}</span>
        )}
      </div>
    </form>
  );
}
