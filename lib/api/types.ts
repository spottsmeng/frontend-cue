import type { components } from "./schema.gen";

// Convenience aliases over the generated OpenAPI component schemas — every
// type below is a straight re-export, never a hand-maintained shape, so
// `pnpm generate:api` is always the single source of truth (F0's own
// judgment call for the client itself, extended here for readability at
// call sites instead of `components["schemas"]["X"]` everywhere).

export type LivingWipReport = components["schemas"]["LivingWipReportOut"];
export type ReportFieldT = components["schemas"]["ReportField"];
export type ReportProvenanceT = components["schemas"]["ReportProvenance"];
export type ProjectOverviewSection = components["schemas"]["ProjectOverviewSection"];
export type ProjectOverviewVisualReference = components["schemas"]["ProjectOverviewVisualReference"];
export type MilestoneTrackerRow = components["schemas"]["MilestoneTrackerRow"];
export type VendorStatusSection = components["schemas"]["VendorStatusSection"];
export type VendorStatusRow = components["schemas"]["VendorStatusRow"];
export type BudgetSummarySection = components["schemas"]["BudgetSummarySection"];
export type RiskAndIssuesSection = components["schemas"]["RiskAndIssuesSection"];
export type RiskLogRow = components["schemas"]["RiskLogRow"];
export type DeviationLogRow = components["schemas"]["DeviationLogRow"];
export type DecisionAndApprovalLogSection = components["schemas"]["DecisionAndApprovalLogSection"];
export type DecisionLogRow = components["schemas"]["DecisionLogRow"];
export type OutstandingApprovalRow = components["schemas"]["OutstandingApprovalRow"];
export type NextStepsSection = components["schemas"]["NextStepsSection"];
export type CommitmentSummary = components["schemas"]["CommitmentSummary"];
export type ReportSnapshot = components["schemas"]["ReportSnapshotOut"];

export type CommitmentOut = components["schemas"]["CommitmentOut"];
export type EvidenceOut = components["schemas"]["EvidenceOut"];
export type CommitmentCorrection = components["schemas"]["CommitmentCorrection"];
export type VerifyRequest = components["schemas"]["VerifyRequest"];
export type PaymentStatusUpdate = components["schemas"]["PaymentStatusUpdate"];

export type DeviationOut = components["schemas"]["DeviationOut"];
export type DeviationConfirmRequest = components["schemas"]["DeviationConfirmRequest"];

export type BudgetOut = components["schemas"]["BudgetOut"];
export type BudgetWrite = components["schemas"]["BudgetWrite"];

export type OutboundMessageOut = components["schemas"]["OutboundMessageOut"];
export type WritebackDraftUpdate = components["schemas"]["WritebackDraftUpdate"];

export type EffectiveRoleOut = components["schemas"]["EffectiveRoleOut"];
export type MembershipRole = EffectiveRoleOut["roles"][number];

export type VerificationState = ReportFieldT["verification_state"];

// `ExportBlockedCommitment` (app/reports/schema.py) is never used as a
// response_model — app/api/reports.py's export_report constructs the 409
// body as a raw dict passed to HTTPException(detail=...), so
// openapi-typescript never generates a named component for it, AND
// FastAPI's own default exception handler wraps whatever `detail=` was
// given under a top-level "detail" key — confirmed against the real
// response, not assumed (an earlier version of this type omitted that
// wrapper and silently rendered `blocked.body.message` as blank while
// crashing on `.blocking_commitments.map` of undefined).
export interface ExportBlockedBody {
  detail: {
    message: string;
    blocking_commitments: {
      commitment_id: string;
      deliverable_en: string;
      reason: "pending_verification";
    }[];
  };
}
