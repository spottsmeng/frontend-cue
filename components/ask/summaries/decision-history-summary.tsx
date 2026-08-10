import { DecisionLogRow } from "@/components/living-wip/decision-log-row";
import type { DecisionHistorySummary as DecisionHistorySummaryT } from "@/lib/api/types";

export function DecisionHistorySummaryView({
  summary,
  onOpenCommitment,
}: {
  summary: DecisionHistorySummaryT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  if (summary.decisions.length === 0) {
    return <p className="text-sm text-ink-muted">No decisions recorded on this project yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {summary.decisions.map((d) => (
        <DecisionLogRow key={d.audit_log_id} decision={d} onOpenCommitment={onOpenCommitment} />
      ))}
    </ul>
  );
}
