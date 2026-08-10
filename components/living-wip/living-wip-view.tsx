"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/format";
import { useEffectiveRoles } from "@/lib/roles";
import { useReportQuery } from "@/lib/reports/hooks";

import { CommitmentDetailPanel } from "./commitment-detail-panel";
import { ExportHistoryPanel } from "./export-history-panel";
import { FreezeExportControl } from "./freeze-export-control";
import { BudgetSummaryPanel } from "./sections/budget-summary-section";
import { DecisionLogPanel } from "./sections/decision-log-section";
import { MilestoneTrackerPanel } from "./sections/milestone-tracker-section";
import { NextStepsPanel } from "./sections/next-steps-section";
import { ProjectOverviewPanel } from "./sections/project-overview-section";
import { RiskAndIssuesPanel } from "./sections/risk-and-issues-section";
import { VendorStatusPanel } from "./sections/vendor-status-section";
import { SupersessionReviewPanel } from "./supersession-review-panel";

/**
 * §12.2's Living WIP — single scrolling document at a stable per-project
 * URL, seven sections in the Challenge Brief's own order. The pending-
 * verification entry point this milestone's own prompt asks for a decision
 * on: Living WIP alone, not a separate "needs verification" view — every
 * section that carries a commitment reference (vendor status's outstanding/
 * confirmed rows, next steps, decision log, budget summary's provenance)
 * already opens the same commitment detail drawer, so a dedicated pending
 * list would only be a filtered re-projection of what's already one click
 * away from several places on this page. Documented in full in
 * frontend/PROGRESS.md's F1 notes.
 */
export function LivingWipView({ projectId }: { projectId: string }) {
  const { data: report, isLoading, isError } = useReportQuery(projectId);
  const { data: roles } = useEffectiveRoles(projectId);
  const [openCommitmentId, setOpenCommitmentId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="p-6 text-sm text-ink-muted">Loading Living WIP…</p>;
  }
  if (isError || !report) {
    return <p className="p-6 text-sm text-critical">Could not load the report. Please retry.</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur">
        <span className="font-mono text-xs text-ink-muted">
          Last ledger change: {formatDateTime(report.generated_at)}
        </span>
        <FreezeExportControl
          projectId={projectId}
          effectiveRoles={roles?.roles}
          onOpenCommitment={setOpenCommitmentId}
        />
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <ProjectOverviewPanel section={report.project_overview} onOpenCommitment={setOpenCommitmentId} />
        <MilestoneTrackerPanel rows={report.milestone_tracker} />
        <VendorStatusPanel section={report.vendor_status} onOpenCommitment={setOpenCommitmentId} />
        <SupersessionReviewPanel projectId={projectId} effectiveRoles={roles?.roles} />
        <BudgetSummaryPanel
          section={report.budget_summary}
          projectId={projectId}
          effectiveRoles={roles?.roles}
          onOpenCommitment={setOpenCommitmentId}
        />
        <RiskAndIssuesPanel
          section={report.risk_and_issues}
          projectId={projectId}
          effectiveRoles={roles?.roles}
          onOpenCommitment={setOpenCommitmentId}
        />
        <DecisionLogPanel section={report.decision_and_approval_log} onOpenCommitment={setOpenCommitmentId} />
        <NextStepsPanel section={report.next_steps} onOpenCommitment={setOpenCommitmentId} />
        <ExportHistoryPanel projectId={projectId} />
      </div>

      {openCommitmentId && (
        <CommitmentDetailPanel
          projectId={projectId}
          commitmentId={openCommitmentId}
          onClose={() => setOpenCommitmentId(null)}
        />
      )}
    </div>
  );
}
