import { useTranslations } from "next-intl";

/**
 * Shared across every screen that renders a 0–1 extraction/resolution
 * confidence score (Admin's Channel Identity review queue, a spec claim,
 * voice-note evidence, a captured message's identity resolution) — one
 * component so the visual language for "how sure is CUE about this" stays
 * identical everywhere it appears, rather than each screen inventing its
 * own badge.
 *
 * Tone is value-driven, not caller-chosen: below 0.7 renders in `warning`
 * (the same threshold `GET /admin/channel-identities`'s own
 * `max_confidence` default already uses server-side to decide what counts
 * as "needs a human look" — reused here, not a second number invented for
 * the frontend); at or above 0.7 renders quiet/neutral (`surface-sunk` /
 * `ink-secondary`, DESIGN.md's "no action needed" tone), since a high
 * confidence score is the unremarkable common case, not something to flag.
 */
export function ConfidenceBadge({ value }: { value: number }) {
  const t = useTranslations("common");
  const needsReview = value < 0.7;
  const toneClasses = needsReview ? "bg-warning-soft text-warning" : "bg-surface-sunk text-ink-secondary";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${toneClasses}`}>
      {t("confidence", { value: (value * 100).toFixed(0) })}
    </span>
  );
}

export function ManuallyVerifiedBadge() {
  const t = useTranslations("common");
  return (
    <span className="rounded-full bg-signal-soft px-2 py-0.5 text-xs text-signal">
      {t("manuallyVerified")}
    </span>
  );
}
