"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { type ThemePreference, useUIStore } from "@/lib/store/ui-store";

// Zustand's initial `theme` is read from localStorage at module init, which
// runs identically on server and client before hydration — but the
// *server* render always sees "system" (no `window`), so this needs to
// stay false until after hydration to avoid a mismatch on whichever option
// is marked active. `useSyncExternalStore` with a no-op subscribe is the
// standard hydration-safe way to express "false on the server, true on the
// client" without the cascading extra render a `useEffect(() =>
// setState(true))` mount-flag causes (flagged by this project's own
// `react-hooks/set-state-in-effect` lint rule).
function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const mounted = useHasMounted();
  const t = useTranslations("nav");

  const OPTIONS: { value: ThemePreference; label: string }[] = [
    { value: "system", label: t("themeSystem") },
    { value: "light", label: t("themeLight") },
    { value: "dark", label: t("themeDark") },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-md border border-border bg-surface-sunk p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            className={`rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
              active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
