import type { RiskLogRow as RiskLogRowT } from "@/lib/api/types";

import { ProvenanceChip } from "./provenance-chip";

/**
 * One `RiskLogRow` — extracted out of `sections/risk-and-issues-section.tsx`
 * (F1) for the same reuse reason `decision-log-row.tsx` was: F5's Successor
 * Brief reuses the report composer's own `RiskLogRow` shape directly
 * (app/reports/schema.py), so its rendering should be the same component,
 * not a second copy.
 */
export function RiskLogRow({
  risk,
  onOpenCommitment,
}: {
  risk: RiskLogRowT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  return (
    <li className="rounded-md border border-border p-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-ink">{risk.downstream_consequence}</p>
        <ProvenanceChip provenance={[risk.provenance]} onOpenCommitment={onOpenCommitment} />
      </div>
      <p className="mt-1 font-mono text-xs text-ink-muted">
        {risk.source} · {risk.severity} · {risk.status}
        {risk.base_rate !== null && ` · base rate ${(risk.base_rate * 100).toFixed(0)}%`}
      </p>
    </li>
  );
}
