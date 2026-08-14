"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE_NAME, type Locale } from "@/i18n/config";

/**
 * Sets the locale cookie i18n/request.ts reads server-side on every
 * subsequent request. A Server Action, not a route handler — called
 * directly from components/app-shell/locale-switcher.tsx, then the
 * client calls `router.refresh()` to re-render Server Components under
 * the new locale (next-intl's own documented pattern for the
 * without-routing setup).
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    // A year — a UI language choice is a long-lived preference, same
    // durability class as the theme toggle's own localStorage (no expiry
    // there at all).
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
}
