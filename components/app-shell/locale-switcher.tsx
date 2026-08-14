"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { locales, type Locale } from "@/i18n/config";
import { setLocale } from "@/lib/i18n/set-locale";

// Native names, not English glosses — a locale switcher naming its own
// options in English defeats the point for a reader who can't read English
// yet. 简体/繁體 themselves are the two-character distinguisher CUE-Tech-
// Stack.md §6 already treats as the load-bearing difference, not "Chinese
// (Simplified)"/"Chinese (Traditional)" glossed in English.
const LABELS: Record<Locale, string> = {
  en: "EN",
  "zh-Hans": "简体",
  "zh-Hant": "繁體",
};

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticLocale, setOptimisticLocale] = useState<Locale | null>(null);

  const displayedLocale = optimisticLocale ?? (activeLocale as Locale);

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="flex items-center gap-0.5 rounded-md border border-border bg-surface-sunk p-0.5"
    >
      {locales.map((locale) => {
        const active = displayedLocale === locale;
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending}
            lang={locale}
            onClick={() => {
              setOptimisticLocale(locale);
              startTransition(async () => {
                await setLocale(locale);
                router.refresh();
              });
            }}
            className={`rounded-sm px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}
