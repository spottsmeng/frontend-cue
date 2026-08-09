import type { BudgetSummarySection as BudgetSummarySectionT, MembershipRole } from "@/lib/api/types";

import { BudgetReviseForm } from "../budget-revise-form";
import { ReportField } from "../report-field";
import { SectionPanel } from "../section-panel";

/** §6.10's own paragraph, rendered exactly as the API composed it — this
 * component does not recompute any of the four figures itself
 * (app/reports/composer.py's compute_budget_summary is the single
 * implementation, reused by the export gate too). */
export function BudgetSummaryPanel({
  section,
  projectId,
  effectiveRoles,
  onOpenCommitment,
}: {
  section: BudgetSummarySectionT;
  projectId: string;
  effectiveRoles: MembershipRole[] | undefined;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  return (
    <SectionPanel
      title="Budget summary"
      action={
        <BudgetReviseForm
          projectId={projectId}
          currentCurrency={section.currency}
          effectiveRoles={effectiveRoles}
        />
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-ink-muted">Approved budget</dt>
          <dd className="mt-0.5">
            <ReportField
              field={section.approved_budget}
              kind="money"
              currency={section.currency}
              onOpenCommitment={onOpenCommitment}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Committed spend</dt>
          <dd className="mt-0.5">
            <ReportField
              field={section.committed_spend}
              kind="money"
              currency={section.currency}
              onOpenCommitment={onOpenCommitment}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Outstanding payments</dt>
          <dd className="mt-0.5">
            <ReportField
              field={section.outstanding_payments}
              kind="money"
              currency={section.currency}
              onOpenCommitment={onOpenCommitment}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Variance</dt>
          <dd className="mt-0.5">
            <ReportField
              field={section.variance}
              kind="money"
              currency={section.currency}
              onOpenCommitment={onOpenCommitment}
            />
          </dd>
        </div>
      </dl>
    </SectionPanel>
  );
}
