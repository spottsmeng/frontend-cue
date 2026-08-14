// CUE-PRD.md §7.6 NFR-ACC-02 / §3.2: exactly three locales, EN / 简体 / 繁體
// — Simplified and Traditional are two distinct locales, not one "Chinese"
// collapsing the two (CUE-Tech-Stack.md §6's own warning against exactly
// that category error, applied here to UI chrome the same way it's already
// applied to search tokenisation). A fourth locale is explicitly out of v1
// scope (§3.2: "additional languages are a post-v1 regional extension").
export const locales = ["en", "zh-Hans", "zh-Hant"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
