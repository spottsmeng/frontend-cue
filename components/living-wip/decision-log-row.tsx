import { formatDateTime } from "@/lib/format";
import type { DecisionLogRow as DecisionLogRowT } from "@/lib/api/types";

import { ProvenanceChip } from "./provenance-chip";

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * `AuditLog.detail` has no one fixed shape across the actions that write to
 * it (a correction's `changes: {field: {before, after}}}`, a lifecycle
 * transition's `trigger`, write-back's `outbound_message_id`, a deviation
 * resolution's `resolution_date`/`resolution_owner`, ...) — `changes` is
 * special-cased into a readable "field: before → after" line since it's
 * the single highest-value case (what a PM actually corrected); every
 * other key falls back to a plain "key: value" line rather than silently
 * dropping it. Exported for decision-log-row.test.tsx.
 */
export function formatDecisionDetail(detail: Record<string, unknown>): { key: string; text: string }[] {
  const { changes, ...rest } = detail;
  const lines: { key: string; text: string }[] = [];

  if (changes && typeof changes === "object") {
    for (const [field, change] of Object.entries(changes as Record<string, unknown>)) {
      if (change && typeof change === "object" && "before" in change && "after" in change) {
        const { before, after } = change as { before: unknown; after: unknown };
        lines.push({ key: field, text: `${field}: ${formatDetailValue(before)} → ${formatDetailValue(after)}` });
      } else {
        lines.push({ key: field, text: `${field}: ${formatDetailValue(change)}` });
      }
    }
  }
  for (const [key, value] of Object.entries(rest)) {
    lines.push({ key, text: `${key}: ${formatDetailValue(value)}` });
  }
  return lines;
}

/**
 * One `DecisionLogRow` — extracted out of `sections/decision-log-section.tsx`
 * (F1) so F5's Successor Brief can reuse the exact same row rendering for
 * its own decision-history section, per that milestone's own instruction
 * ("reuse rendering components you already built for F1's Living WIP
 * sections... since they're genuinely the same row shape") rather than a
 * second, parallel decision-row component. Also reused, unmodified, by
 * Ask's decision-history and period-digest summaries
 * (components/ask/summaries/) — one place to add `detail` rendering
 * (Blind Spots item 7) covers all four surfaces at once.
 */
export function DecisionLogRow({
  decision,
  onOpenCommitment,
}: {
  decision: DecisionLogRowT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const detailLines = formatDecisionDetail(decision.detail);
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
      {detailLines.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {detailLines.map((line) => (
            <p key={line.key} className="font-mono text-xs text-ink-muted">
              {line.text}
            </p>
          ))}
        </div>
      )}
    </li>
  );
}
