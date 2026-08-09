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
  { label: string; text: string; bg: string }
> = {
  auto: { label: "Auto", text: "text-verify-auto", bg: "bg-surface-sunk" },
  pending_verification: {
    label: "Pending verification",
    text: "text-verify-pending",
    bg: "bg-warning-soft",
  },
  human_verified: { label: "Verified", text: "text-verify-verified", bg: "bg-signal-soft" },
  human_corrected: { label: "Corrected", text: "text-verify-corrected", bg: "bg-dusk-soft" },
};

export function VerificationBadge({ state }: { state: VerificationState }) {
  if (state === "not_applicable") {
    return <span className="text-xs text-ink-muted">—</span>;
  }
  const { label, text, bg } = CONFIG[state];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      {label}
    </span>
  );
}
