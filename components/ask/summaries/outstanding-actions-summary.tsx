import { CommitmentSummaryRow } from "@/components/living-wip/commitment-summary-row";
import type { OutstandingActionsSummary as OutstandingActionsSummaryT } from "@/lib/api/types";

const WINDOW_LABEL: Record<string, string> = {
  overdue: "Overdue",
  due_within_7_days: "Due within 7 days",
  due_within_30_days: "Due within 30 days",
  due_later: "Due later",
  no_due_date: "No due date",
};

/**
 * FR-ASK-05's "by owner and by due window" taken literally by the backend —
 * `OutstandingActionsSummary` carries both groupings of the same open-
 * commitment set at once; both render here, not a picker between them.
 */
export function OutstandingActionsSummaryView({
  summary,
  onOpenCommitment,
}: {
  summary: OutstandingActionsSummaryT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">By owner</p>
        {summary.by_owner.length === 0 ? (
          <p className="text-sm text-ink-muted">No outstanding actions.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {summary.by_owner.map((group) => (
              <div key={group.party_id}>
                <p className="mb-1 text-sm font-medium text-ink">{group.party_name}</p>
                <ul className="flex flex-col gap-1">
                  {group.commitments.map((c) => (
                    <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">By due window</p>
        <div className="flex flex-col gap-3">
          {summary.by_due_window
            .filter((group) => group.commitments.length > 0)
            .map((group) => (
              <div key={group.window}>
                <p className="mb-1 text-sm font-medium text-ink">
                  {WINDOW_LABEL[group.window] ?? group.window}
                </p>
                <ul className="flex flex-col gap-1">
                  {group.commitments.map((c) => (
                    <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
