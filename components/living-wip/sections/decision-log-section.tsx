import { formatDate } from "@/lib/format";
import type { DecisionAndApprovalLogSection as DecisionAndApprovalLogSectionT } from "@/lib/api/types";

import { DecisionLogRow } from "../decision-log-row";
import { EmptyState } from "../empty-state";
import { ProvenanceChip } from "../provenance-chip";
import { SectionPanel } from "../section-panel";

export function DecisionLogPanel({
  section,
  onOpenCommitment,
}: {
  section: DecisionAndApprovalLogSectionT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const empty = section.decisions.length === 0 && section.outstanding_approvals.length === 0;

  return (
    <SectionPanel title="Decision and approval log">
      {empty ? (
        <EmptyState message="No decisions or outstanding approvals recorded yet." />
      ) : (
        <div className="flex flex-col gap-4">
          {section.outstanding_approvals.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">
                Outstanding approvals
              </p>
              <ul className="flex flex-col gap-1.5">
                {section.outstanding_approvals.map((a) => (
                  <li
                    key={a.commitment_id}
                    className="flex items-center justify-between rounded-md border border-border p-2"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenCommitment(a.commitment_id)}
                      className="text-left text-sm text-signal hover:underline"
                    >
                      {a.deliverable_en}
                    </button>
                    <span className="flex items-center gap-2 font-mono text-xs text-ink-muted">
                      {a.due_at && `due ${formatDate(a.due_at)}`}
                      <ProvenanceChip provenance={[a.provenance]} onOpenCommitment={onOpenCommitment} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section.decisions.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">
                Recent decisions
              </p>
              <ul className="flex flex-col gap-1.5">
                {section.decisions.map((d) => (
                  <DecisionLogRow key={d.audit_log_id} decision={d} onOpenCommitment={onOpenCommitment} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </SectionPanel>
  );
}
