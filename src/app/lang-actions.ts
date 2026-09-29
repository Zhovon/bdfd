"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LANG_COOKIE, type Locale } from "@/lib/i18n";

/** Persist the visitor's language choice for a year, then re-render the tree. */
export async function setLocale(locale: Locale): Promise<void> {
  const value: Locale = locale === "en" ? "en" : "bn";
  (await cookies()).set(LANG_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
