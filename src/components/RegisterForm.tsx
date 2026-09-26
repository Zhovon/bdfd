"use client";

import { useActionState } from "react";
import { registerUser, type RegisterState } from "@/app/actions";
import Turnstile from "@/components/Turnstile";

type Key =
  | "fullName"
  | "officialEmail"
  | "mobile"
  | "serviceId"
  | "designation"
  | "posting"
  | "password"
  | "confirm";

const fields: { key: Key; label: string; type?: string; full?: boolean; hint?: string }[] = [
  { key: "fullName", label: "Full name", full: true },
  { key: "officialEmail", label: "Official email", type: "email" },
  { key: "mobile", label: "Mobile number", type: "tel" },
  { key: "serviceId", label: "Govt PDS / Service ID" },
  { key: "designation", label: "Designation" },
  { key: "posting", label: "Present posting", full: true },
  { key: "password", label: "Password", type: "password", hint: "min. 8 characters" },
  { key: "confirm", label: "Confirm password", type: "password" },
];

export default function RegisterForm({ siteKey }: { siteKey: string }) {
  const [state, formAction, pending] = useActionState<RegisterState | null, FormData>(
    registerUser,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-brand bg-husk-deep p-8">
        <p className="log-label text-brand">Registration received</p>
        <p className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold text-field">
          Awaiting approval
        </p>
        <p className="mt-2 text-stone">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-6 sm:grid-cols-2">
      {fields.map((f) => (
        <label key={f.key} className={f.full ? "sm:col-span-2" : ""}>
          <span className="log-label flex items-center gap-2 text-field">
            {f.label}
            {f.hint && <span className="text-stone">· {f.hint}</span>}
          </span>
          <input
            name={f.key}
            type={f.type ?? "text"}
            required
            autoComplete="off"
            className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none transition-colors focus:border-brand"
            aria-invalid={Boolean(state?.fieldErrors?.[f.key])}
          />
          {state?.fieldErrors?.[f.key] && (
            <span className="mt-1 block text-sm text-grain">{state.fieldErrors[f.key]}</span>
          )}
        </label>
      ))}

      <div className="sm:col-span-2">
        <span className="log-label mb-2 block text-field">Verify you&apos;re human</span>
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
          {pending ? "Submitting…" : "Submit registration"}
        </button>
        {state && !state.ok && !state.fieldErrors && (
          <span className="text-sm text-grain">{state.message}</span>
        )}
      </div>
    </form>
  );
}
