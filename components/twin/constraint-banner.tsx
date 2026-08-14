import { useTranslations } from "next-intl";

import { formatSlackDays } from "@/lib/twin/presentation";

/**
 * FR-TWN-06: "the vendor or workstream that has become the binding
 * constraint" — surfaced up top, always visible, not buried in the
 * timeline list, since it's the single most actionable fact this whole
 * surface computes (the current tightest link, before any hypothetical
 * shift). `GET /twin/constraint` is the *current* graph only — the
 * propagation simulator's own `binding_constraint_after` is a distinct
 * figure for a hypothetical shift (FR-TWN-06's own "can change" wording),
 * never conflated with this one.
 */
export function ConstraintBanner({
  milestoneName,
  slackDays,
}: {
  milestoneName: string | null;
  slackDays: number | null;
}) {
  const t = useTranslations("twin.constraintBanner");
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-sunk px-4 py-2.5 text-sm">
      <span className="font-medium text-ink">{t("label")}</span>
      {milestoneName ? (
        <>
          <span className="text-ink">{milestoneName}</span>
          <span className="font-mono text-xs text-ink-muted">({formatSlackDays(slackDays)})</span>
        </>
      ) : (
        <span className="text-ink-muted">{t("none")}</span>
      )}
    </div>
  );
}
