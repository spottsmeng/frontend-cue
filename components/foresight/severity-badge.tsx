import type { RiskSeverity } from "@/lib/api/types";

import { StatusDot } from "../living-wip/status-dot";

/**
 * DESIGN.md's own severity mapping is provisional ("a reasonable default,
 * not tested against every real value yet") — this is F3 actually wiring
 * it. `RiskSeverityLiteral` has four steps (low/medium/high/critical) but
 * the status quad only has three real "concern" hues (warning/serious/
 * critical) plus `good`, which a Risk — by definition never "on plan" —
 * should never borrow. `low` is rendered deliberately quieter than the
 * status-quad's own `warning` (surface-sunk/ink-secondary, not
 * warning-soft/warning) so the four steps still read as a progression
 * rather than two pairs of identical color at different label text; `low`
 * and `medium` still share the same dot hue on purpose (PRD §12.1: color is
 * never the sole carrier of meaning — the label text is what actually
 * distinguishes them, same discipline StatusDot's own comment states).
 */
const CONFIG: Record<
  RiskSeverity,
  { label: string; bg: string; text: string; dot: "warning" | "serious" | "critical" }
> = {
  low: { label: "Low", bg: "bg-surface-sunk", text: "text-ink-secondary", dot: "warning" },
  medium: { label: "Medium", bg: "bg-warning-soft", text: "text-warning", dot: "warning" },
  high: { label: "High", bg: "bg-serious-soft", text: "text-serious", dot: "serious" },
  critical: { label: "Critical", bg: "bg-critical-soft", text: "text-critical", dot: "critical" },
};

export function SeverityBadge({ severity }: { severity: RiskSeverity }) {
  const { label, bg, text, dot } = CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      <StatusDot tone={dot} />
      {label}
    </span>
  );
}
