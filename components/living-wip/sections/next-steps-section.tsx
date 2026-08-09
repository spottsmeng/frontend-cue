import { formatDate } from "@/lib/format";
import type { NextStepsSection as NextStepsSectionT } from "@/lib/api/types";

import { CommitmentSummaryRow } from "../commitment-summary-row";
import { EmptyState } from "../empty-state";
import { ProvenanceChip } from "../provenance-chip";
import { SectionPanel } from "../section-panel";

export function NextStepsPanel({
  section,
  onOpenCommitment,
}: {
  section: NextStepsSectionT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const empty = section.open_commitments.length === 0 && section.open_milestones.length === 0;

  return (
    <SectionPanel title="Next steps">
      {empty ? (
        <EmptyState message="Nothing open — every commitment and milestone on this project is resolved, and no vendor currently owes anything." />
      ) : (
        <div className="flex flex-col gap-4">
          {section.open_commitments.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">
                Open commitments
              </p>
              <ul className="flex flex-col gap-1">
                {section.open_commitments.map((c) => (
                  <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                ))}
              </ul>
            </div>
          )}
          {section.open_milestones.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">
                Open milestones
              </p>
              <ul className="flex flex-col gap-1">
                {section.open_milestones.map((m) => (
                  <li
                    key={m.milestone_id}
                    className="flex items-center justify-between rounded-md border border-border p-2 text-sm"
                  >
                    <span className="text-ink">{m.name}</span>
                    <span className="flex items-center gap-2 font-mono text-xs text-ink-muted">
                      {m.planned_at && `planned ${formatDate(m.planned_at)}`}
                      <ProvenanceChip provenance={[m.provenance]} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </SectionPanel>
  );
}
