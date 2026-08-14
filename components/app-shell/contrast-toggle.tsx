"use client";

import { useTranslations } from "next-intl";

import { useMeQuery, useUpdateHighContrastMutation } from "@/lib/preferences/hooks";

/**
 * NFR-ACC-03's high-contrast toggle — a real, persisted control, not just
 * the CSS seam (app/globals.css's `[data-contrast="high"]`). Sibling to
 * ThemeToggle in shape (same two-state pressed-button pattern) but backed
 * by TanStack Query against `GET/PATCH /users/me`, not the zustand
 * ui-store — this preference is genuinely per-user (frontend/PROGRESS.md's
 * F9 notes: it follows a low-vision user across devices), unlike theme's
 * deliberate device-local localStorage choice.
 */
export function ContrastToggle() {
  const meQuery = useMeQuery();
  const mutation = useUpdateHighContrastMutation();
  const t = useTranslations("nav");

  const highContrast = mutation.isPending
    ? mutation.variables
    : (meQuery.data?.high_contrast ?? false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={highContrast}
      aria-label={t("highContrast")}
      title={t("highContrast")}
      disabled={meQuery.isLoading}
      onClick={() => mutation.mutate(!highContrast)}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        highContrast
          ? "border-signal bg-signal-soft text-signal"
          : "border-border bg-surface-sunk text-ink-muted hover:text-ink-secondary"
      }`}
    >
      <span aria-hidden>◐</span>
      {t("highContrast")}
    </button>
  );
}
