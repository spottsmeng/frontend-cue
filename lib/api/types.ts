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
export type DeviationResolveRequest = components["schemas"]["DeviationResolveRequest"];
export type DeviationStatus = DeviationOut["status"];

export type BudgetOut = components["schemas"]["BudgetOut"];
export type BudgetWrite = components["schemas"]["BudgetWrite"];

export type OutboundMessageOut = components["schemas"]["OutboundMessageOut"];
export type WritebackDraftUpdate = components["schemas"]["WritebackDraftUpdate"];

export type EffectiveRoleOut = components["schemas"]["EffectiveRoleOut"];
export type MembershipRole = EffectiveRoleOut["roles"][number];
export type ProjectMemberOut = components["schemas"]["ProjectMemberOut"];

// --- Production Twin (F2, FR-TWN) ------------------------------------------

export type MilestoneOut = components["schemas"]["MilestoneOut"];
export type MilestoneCreate = components["schemas"]["MilestoneCreate"];
export type MilestoneUpdate = components["schemas"]["MilestoneUpdate"];
export type DependencyOut = components["schemas"]["DependencyOut"];
export type DependencyCreate = components["schemas"]["DependencyCreate"];
export type DependencyUpdate = components["schemas"]["DependencyUpdate"];
export type TwinNodeOut = components["schemas"]["TwinNodeOut"];
export type TwinCurrentOut = components["schemas"]["TwinCurrentOut"];
export type TwinConstraintOut = components["schemas"]["TwinConstraintOut"];
export type PropagateCandidate = components["schemas"]["PropagateCandidate"];
export type PropagateRequest = components["schemas"]["PropagateRequest"];
export type AffectedNodeOut = components["schemas"]["AffectedNodeOut"];
export type PropagateCandidateResult = components["schemas"]["PropagateCandidateResult"];
export type PropagateResponse = components["schemas"]["PropagateResponse"];
export type OntologyTermOut = components["schemas"]["OntologyTermOut"];

// `create_dependency`'s cycle-rejection 422 and `delete_milestone`'s
// referenced-edge 409 are both raised as a plain `HTTPException(detail=
// "...")` (backend/app/api/milestones.py), never a response_model — so
// openapi-typescript only ever generates `HTTPValidationError`'s
// `{detail: ValidationError[]}` shape for these operations' typed 422, which
// doesn't match either real body at the wire level. Same untyped-at-the-
// wire-level situation lib/reports/hooks.ts's ExportBlockedError already
// documents for the export-blocked 409 — `detail` here is a bare string, not
// an array, for both of these.
export interface TwinErrorBody {
  detail: string;
}

export type VerificationState = ReportFieldT["verification_state"];

// --- Foresight (F3, FR-FOR / FR-DEV / FR-NTF) -------------------------------

export type RiskOut = components["schemas"]["RiskOut"];
export type RiskSource = RiskOut["source"];
export type RiskSeverity = RiskOut["severity"];
export type RiskStatus = RiskOut["status"];

export type NotificationOut = components["schemas"]["NotificationOut"];
export type NotificationChannel = components["schemas"]["NotificationOut"]["delivered_via"];

export type WebhookSubscriptionOut = components["schemas"]["WebhookSubscriptionOut"];
export type WebhookSubscriptionCreated = components["schemas"]["WebhookSubscriptionCreated"];
export type WebhookSubscriptionCreate = components["schemas"]["WebhookSubscriptionCreate"];
export type WebhookEventType = WebhookSubscriptionCreate["event_types"][number];

export type ForesightThresholdOut = components["schemas"]["ForesightThresholdOut"];
export type ForesightThresholdMetric = ForesightThresholdOut["metric"];

export type QuietHoursConfigOut = components["schemas"]["QuietHoursConfigOut"];

// `acknowledge_risk`/`resolve_risk`'s 409 ("cannot acknowledge/resolve a
// {status} risk") is a plain HTTPException(detail=str) like TwinErrorBody
// above, not a typed response_model — same untyped-at-the-wire-level
// situation, confirmed against app/api/risks.py directly rather than assumed.
export interface ForesightErrorBody {
  detail: string;
}

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
