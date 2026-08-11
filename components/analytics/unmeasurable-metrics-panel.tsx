import { NotYetMeasurable } from "@/components/charts/not-yet-measurable";

/**
 * The seven PRD §13 metrics with no real backend data source today — named
 * explicitly rather than omitted, per F8's own ethic ("a number on this
 * screen that isn't real is worse than a missing one"). Each blocker names
 * the real gap (see frontend/PROGRESS.md's F8 notes for the full
 * reasoning), not a generic "coming soon".
 */
const UNMEASURABLE_METRICS: { metric: string; blocker: string }[] = [
  {
    metric: "Coordination overhead (PM minutes on relay activity)",
    blocker:
      "needs product-usage telemetry — no frontend usage-event pipeline exists anywhere in this codebase yet.",
  },
  {
    metric: "Status meeting duration",
    blocker:
      "needs a calendar/Teams-meeting-duration integration — FR-CAP-13's transcript ingestion captures meeting content, not duration.",
  },
  {
    metric: "Report preparation time (WIP opened → exported)",
    blocker:
      "needs a \"WIP page opened\" usage event — only the export half is timestamped today (ReportSnapshot.generated_at).",
  },
  {
    metric: "Active chats per PM per day",
    blocker: "needs product-usage telemetry for CUE's own UI — the same gap as coordination overhead above.",
  },
  {
    metric: "Contingency drawn",
    blocker:
      "Budget only carries approved_amount/currency — no contingency-vs-base split exists in the data model. This is a schema/product decision for Finance or a future backend session, not one this dashboard makes unilaterally.",
  },
  {
    metric: "Commitment capture rate (detected vs. ground truth)",
    blocker:
      "no real ground-truth corpus exists yet — Phase 0 discovery (PRD §15) hasn't run for any live project; cue-eval's ten synthetic cases are a regression smoke test, not an accuracy measurement.",
  },
  {
    metric: "Extraction accuracy by slice (language / channel / vendor category)",
    blocker:
      "drift-check results aren't persisted to a queryable table yet — only available via an offline cue-eval/run_eval.py --json run, not a live endpoint (re-running eval on every dashboard load was judged a design smell, not built).",
  },
];

export function UnmeasurableMetricsPanel() {
  return (
    <ul className="flex flex-col gap-2">
      {UNMEASURABLE_METRICS.map((item) => (
        <li key={item.metric}>
          <NotYetMeasurable metric={item.metric} blocker={item.blocker} />
        </li>
      ))}
    </ul>
  );
}
