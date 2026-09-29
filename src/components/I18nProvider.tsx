"use client";

import { createContext, useContext } from "react";
import type { Dict, Locale } from "@/lib/i18n";

type Ctx = { locale: Locale; t: Dict };

const I18nContext = createContext<Ctx | null>(null);

/** Makes the current locale + dictionary available to client components. */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, t: dict }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
