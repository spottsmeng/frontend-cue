import { useTranslations } from "next-intl";

import type { VerificationState } from "@/lib/api/types";

// DESIGN.md's "verification chips" system — a second, independent status
// axis from severity (extraction *trust*, not delivery *risk*), built from
// BRAND hues and rendered as pills, never stripes, so it can never be
// mistaken for the good/warning/serious/critical severity stripe even at a
// glance. All five real `verification_state` values are handled explicitly
// here — `not_applicable` (ReportField-only, "no verification concept at
// all") renders as a plain muted dash, not a pill, since it isn't a trust
// state at all and a pill would misleadingly imply one.
const CONFIG: Record<
  Exclude<VerificationState, "not_applicable">,
  { key: "auto" | "pendingVerification" | "verified" | "corrected"; text: string; bg: string }
> = {
  auto: { key: "auto", text: "text-verify-auto", bg: "bg-surface-sunk" },
  pending_verification: {
    key: "pendingVerification",
    text: "text-verify-pending",
    bg: "bg-warning-soft",
  },
  human_verified: { key: "verified", text: "text-verify-verified", bg: "bg-signal-soft" },
  human_corrected: { key: "corrected", text: "text-verify-corrected", bg: "bg-dusk-soft" },
};

export function VerificationBadge({ state }: { state: VerificationState }) {
  const t = useTranslations("livingWip.verification");
  if (state === "not_applicable") {
    return <span className="text-xs text-ink-muted">—</span>;
  }
  const { key, text, bg } = CONFIG[state];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      {t(key)}
    </span>
  );
}
