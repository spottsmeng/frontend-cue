"use client";

import { useTranslations } from "next-intl";

/**
 * PRD §13's own closing line — "A metrics dashboard ships with the product
 * so Pico verifies these independently" — made a real, visible artefact
 * (not just a code comment), since Pico is a real audience for this
 * honesty, not just a future engineer reading source.
 */
export function MethodologyFootnote() {
  const t = useTranslations("analytics.methodologyFootnote");
  return (
    <div className="rounded-lg border border-border bg-surface-sunk px-4 py-3 text-xs text-ink-secondary">
      <p className="font-medium text-ink">{t("title")}</p>
      <p className="mt-1.5">
        {t("paragraph1")}
      </p>
      <p className="mt-1.5">
        {t("paragraph2")}
      </p>
    </div>
  );
}
