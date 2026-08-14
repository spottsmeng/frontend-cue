import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale, LOCALE_COOKIE_NAME } from "./config";
import { MESSAGE_NAMESPACES } from "./namespaces";

/**
 * next-intl "without i18n routing" (confirmed with the user over the
 * routed-URL alternative before building this — see frontend/PROGRESS.md's
 * F9 notes for the full reasoning): locale lives in a cookie, resolved
 * server-side on every request, never a `[locale]` URL segment. Keeps
 * every existing route, every existing e2e spec's navigation, and this
 * app's own "stable per-project URL" design principle (frontend/DESIGN.md)
 * completely untouched — a fully-supported next-intl mode, not a
 * workaround.
 *
 * Messages are split one file per surface (`messages/{locale}/{namespace}
 * .json`), not one giant per-locale file — every namespace is genuinely
 * owned by one surface (`useTranslations("livingWip")`, etc.), and keeping
 * them physically separate is what let this session's own localisation
 * pass run as several independent, conflict-free edits instead of five
 * agents fighting over the same file.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = stored && isLocale(stored) ? stored : defaultLocale;

  const entries = await Promise.all(
    MESSAGE_NAMESPACES.map(async (namespace) => {
      const mod = await import(`../messages/${locale}/${namespace}.json`);
      return [namespace, mod.default] as const;
    }),
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
  };
});
