import { formatDate, formatMoney } from "@/lib/format";
import type { ReportFieldT } from "@/lib/api/types";

import { ProvenanceChip } from "./provenance-chip";
import { VerificationBadge } from "./verification-badge";

type Kind = "text" | "date" | "money";

/**
 * Renders one `ReportField` — §8.4's provenance-enforcement rule made
 * structural in the API response (`available=False` +
 * `unavailable_reason`), rendered here as an explicit empty/blocked state,
 * never a blank cell or a fabricated placeholder (backend/app/reports/
 * schema.py's own docstring on this exact point — this component's whole
 * job is not to defeat it in the UI).
 */
export function ReportField({
  field,
  kind = "text",
  currency,
  onOpenCommitment,
}: {
  field: ReportFieldT;
  kind?: Kind;
  currency?: string | null;
  onOpenCommitment?: (commitmentId: string) => void;
}) {
  if (!field.available) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm italic text-ink-muted">
        Not available — {field.unavailable_reason ?? "no source recorded"}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-sm text-ink">{formatValue(field.value, kind, currency)}</span>
      <VerificationBadge state={field.verification_state} />
      <ProvenanceChip provenance={field.provenance} onOpenCommitment={onOpenCommitment} />
    </span>
  );
}

function formatValue(value: unknown, kind: Kind, currency?: string | null): string {
  if (value === null || value === undefined) return "—";
  if (kind === "date" && typeof value === "string") return formatDate(value);
  if (kind === "money" && typeof value === "number") return formatMoney(value, currency);
  if (typeof value === "number") return value.toLocaleString("en-SG");
  return String(value);
}
