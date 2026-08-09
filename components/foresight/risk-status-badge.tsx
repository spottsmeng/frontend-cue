import type { RiskStatus } from "@/lib/api/types";

/**
 * A second, independent axis from severity (this milestone's own status,
 * not delivery risk) — same "brand hues, pills, never the status quad"
 * discipline DESIGN.md's verification-chip system already established for
 * exactly this reason: rendered right next to a SeverityBadge on every risk
 * card, it must never be confusable with it, even at a glance.
 *
 * `resolved` and `superseded` are both terminal but mean different things
 * (this milestone's own NON-OBVIOUS note: resolved means the underlying
 * condition was actually addressed; superseded means a newer finding
 * replaced this one before it was ever acted on) — deliberately NOT
 * collapsed into one "closed" bucket, and rendered with visibly different
 * copy/hue, not just a shared muted "done" look.
 */
const CONFIG: Record<RiskStatus, { label: string; bg: string; text: string }> = {
  open: { label: "Open", bg: "bg-surface-sunk", text: "text-ink-secondary" },
  acknowledged: { label: "Acknowledged", bg: "bg-signal-soft", text: "text-signal" },
  resolved: { label: "Resolved", bg: "bg-dusk-soft", text: "text-dusk" },
  superseded: { label: "Superseded", bg: "bg-surface-sunk", text: "text-ink-muted" },
};

export function RiskStatusBadge({ status }: { status: RiskStatus }) {
  const { label, bg, text } = CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}
