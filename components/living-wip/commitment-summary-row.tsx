import { formatDate, formatMoney } from "@/lib/format";
import type { CommitmentSummary } from "@/lib/api/types";

import { ProvenanceChip } from "./provenance-chip";
import { VerificationBadge } from "./verification-badge";

/** Shared row shape for every `CommitmentSummary` list the report renders
 * (vendor status's outstanding/confirmed, next steps' open commitments) —
 * clicking the row opens the same commitment detail drawer §12.2's
 * provenance chip would tap through to, since the row itself already names
 * the commitment id. */
export function CommitmentSummaryRow({
  summary,
  onOpen,
}: {
  summary: CommitmentSummary;
  onOpen: (commitmentId: string) => void;
}) {
  return (
    // A <button> wrapping the whole row (including ProvenanceChip's own
    // <button>) is invalid HTML — nested interactive elements — so only the
    // deliverable name is the click target here, styled to read as the
    // whole row, same split decision-log-section.tsx already uses for its
    // own commitment-linking rows.
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 hover:border-signal">
      <button
        type="button"
        onClick={() => onOpen(summary.commitment_id)}
        className="text-left text-sm text-ink hover:text-signal hover:underline"
      >
        {summary.deliverable_en}
      </button>
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink-muted">{summary.state}</span>
        {summary.due_at && (
          <span className="font-mono text-xs text-ink-muted">due {formatDate(summary.due_at)}</span>
        )}
        {summary.amount !== null && (
          <span className="font-mono text-xs text-ink">
            {formatMoney(summary.amount, summary.currency)}
          </span>
        )}
        <VerificationBadge state={summary.verification_state as "auto" | "pending_verification" | "human_verified" | "human_corrected"} />
        <ProvenanceChip provenance={[summary.provenance]} onOpenCommitment={onOpen} />
      </span>
    </li>
  );
}
