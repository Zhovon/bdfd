"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { setLocale } from "@/app/lang-actions";
import type { Locale } from "@/lib/i18n";

/** A compact EN / বাংলা switch. Persists the choice and refreshes the tree. */
export default function LangToggle({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const [pending, start] = useTransition();
  const router = useRouter();

  const choose = (l: Locale) => {
    if (l === locale || pending) return;
    start(async () => {
      await setLocale(l);
      router.refresh();
    });
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border border-line bg-husk/70 p-0.5 ${className}`}
      role="group"
      aria-label={t.lang.label}
    >
      {(["bn", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          disabled={pending}
          aria-pressed={locale === l}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-70 ${
            locale === l ? "bg-field text-husk" : "text-stone hover:text-field"
          }`}
        >
          {l === "bn" ? "বাংলা" : "EN"}
        </button>
      ))}
    </div>
  );
}
