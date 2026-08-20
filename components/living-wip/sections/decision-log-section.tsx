import { useTranslations } from "next-intl";

import { formatDate } from "@/lib/format";
import type { DecisionAndApprovalLogSection as DecisionAndApprovalLogSectionT } from "@/lib/api/types";

import { DecisionLogRow } from "../decision-log-row";
import { EmptyState } from "../empty-state";
import { ProvenanceChip } from "../provenance-chip";
import { SectionPanel } from "../section-panel";

/**
 * Why a row is in the review queue, next to the row itself.
 *
 * Every route into `pending_verification` collapses into that one state
 * deliberately — one queue a PM checks, not five — which leaves a triage
 * problem the queue itself has to solve: a price waiting for confirmation and
 * a possible hallucination arrive the same colour otherwise, and they want
 * very different amounts of attention.
 *
 * Falls back to the raw key rather than rendering nothing, so a reason added
 * on the backend before its translation lands is visibly untranslated instead
 * of silently invisible.
 */
function ReviewReasonChips({ reasons }: { reasons: string[] }) {
  const t = useTranslations("livingWip.decisionLogSection.reviewReason");
  if (reasons.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {reasons.map((reason) => (
        <span
          key={reason}
          className="rounded-sm border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning"
        >
          {t.has(reason) ? t(reason) : reason}
        </span>
      ))}
    </span>
  );
}

export function DecisionLogPanel({
  section,
  onOpenCommitment,
}: {
  section: DecisionAndApprovalLogSectionT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const t = useTranslations("livingWip.decisionLogSection");
  const empty = section.decisions.length === 0 && section.outstanding_approvals.length === 0;

  return (
    <SectionPanel title={t("title")}>
      {empty ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="flex flex-col gap-4">
          {section.outstanding_approvals.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">
                {t("outstandingApprovals")}
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
                      lang="en"
                      className="text-left text-sm text-signal hover:underline"
                    >
                      {a.deliverable_en}
                    </button>
                    <span className="flex items-center gap-2 font-mono text-xs text-ink-muted">
                      {a.party_name}
                      {a.amount != null &&
                        `${a.currency ?? ""} ${a.amount.toLocaleString()}`.trim()}
                      {a.due_at && t("due", { date: formatDate(a.due_at) })}
                      <ReviewReasonChips reasons={a.verification_reasons} />
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
                {t("recentDecisions")}
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
