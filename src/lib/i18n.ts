import "server-only";
import { cookies } from "next/headers";
import { en } from "./dictionaries/en";
import { bn } from "./dictionaries/bn";

export type Locale = "en" | "bn";
export type Dict = typeof en;

export const LOCALES: Locale[] = ["en", "bn"];
export const DEFAULT_LOCALE: Locale = "bn"; // Bangla-first for the audience
export const LANG_COOKIE = "lang";

const dictionaries: Record<Locale, Dict> = { en, bn };

/** The visitor's chosen locale from the cookie, defaulting to Bangla. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return value === "en" || value === "bn" ? value : DEFAULT_LOCALE;
}

/** The dictionary for the current request's locale. */
export async function getDict(): Promise<Dict> {
  return dictionaries[await getLocale()];
}
