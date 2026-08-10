import { formatDateTime } from "@/lib/format";
import type { DecisionLogRow as DecisionLogRowT } from "@/lib/api/types";

import { ProvenanceChip } from "./provenance-chip";

/**
 * One `DecisionLogRow` — extracted out of `sections/decision-log-section.tsx`
 * (F1) so F5's Successor Brief can reuse the exact same row rendering for
 * its own decision-history section, per that milestone's own instruction
 * ("reuse rendering components you already built for F1's Living WIP
 * sections... since they're genuinely the same row shape") rather than a
 * second, parallel decision-row component.
 */
export function DecisionLogRow({
  decision,
  onOpenCommitment,
}: {
  decision: DecisionLogRowT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  return (
    <li className="rounded-md border border-border p-2 text-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onOpenCommitment(decision.commitment_id)}
          className="text-signal hover:underline"
        >
          {decision.action}
        </button>
        <ProvenanceChip provenance={[decision.provenance]} onOpenCommitment={onOpenCommitment} />
      </div>
      <p className="mt-0.5 font-mono text-xs text-ink-muted">
        {decision.from_state && decision.to_state ? `${decision.from_state} → ${decision.to_state} · ` : ""}
        {formatDateTime(decision.occurred_at)}
      </p>
    </li>
  );
}
