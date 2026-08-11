/**
 * The honest-blocker panel for a §13 metric with no real backend data
 * source yet — F8's own ethic: "a number on this screen that isn't real is
 * worse than a missing one." Never a blank space, never a zero — a named
 * reason, the same "Not available — {unavailable_reason}" discipline
 * components/vendors/vendor-metric-row.tsx already applies at the
 * individual-snapshot level, applied here at the whole-metric level.
 */
export function NotYetMeasurable({
  metric,
  blocker,
}: {
  metric: string;
  blocker: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface-sunk px-4 py-3">
      <p className="text-sm font-medium text-ink">{metric}</p>
      <p className="mt-1 text-xs text-ink-muted">Not yet measurable — {blocker}</p>
    </div>
  );
}
