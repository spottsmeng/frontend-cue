"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useAskSummaryQuery } from "@/lib/ask/hooks";
import type { AskSummaryVariant } from "@/lib/api/types";

import { DecisionHistorySummaryView } from "./summaries/decision-history-summary";
import { OutstandingActionsSummaryView } from "./summaries/outstanding-actions-summary";
import { PeriodDigestSummaryView } from "./summaries/period-digest-summary";
import { ProjectStatusSummaryView } from "./summaries/project-status-summary";
import { VendorStatusSummaryView } from "./summaries/vendor-status-summary";

/**
 * FR-ASK-04/05: five real views, each rendering its own typed response
 * shape — not one generic "summary card" trying to handle all five
 * structurally different payloads identically, per this milestone's own
 * WHAT TO BUILD.
 */
export function SummaryTabs({
  projectId,
  onOpenCommitment,
}: {
  projectId: string;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const t = useTranslations("ask.summaries");
  const [active, setActive] = useState<AskSummaryVariant>("project_status");

  const VARIANTS: { variant: AskSummaryVariant; label: string }[] = [
    { variant: "project_status", label: t("tabs.projectStatus") },
    { variant: "vendor_status", label: t("tabs.vendorStatus") },
    { variant: "period_digest", label: t("tabs.periodDigest") },
    { variant: "decision_history", label: t("tabs.decisionHistory") },
    { variant: "outstanding_actions", label: t("tabs.outstandingActions") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {VARIANTS.map(({ variant, label }) => (
          <button
            key={variant}
            type="button"
            onClick={() => setActive(variant)}
            className={`border-b-2 px-3 py-2 text-sm ${
              active === variant
                ? "border-signal font-medium text-ink"
                : "border-transparent text-ink-secondary hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {active === "period_digest" ? (
        <PeriodDigestSummaryView projectId={projectId} onOpenCommitment={onOpenCommitment} />
      ) : (
        <QueryDrivenSummary variant={active} projectId={projectId} onOpenCommitment={onOpenCommitment} />
      )}
    </div>
  );
}

function QueryDrivenSummary({
  variant,
  projectId,
  onOpenCommitment,
}: {
  variant: Exclude<AskSummaryVariant, "period_digest">;
  projectId: string;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const t = useTranslations("ask.summaries");
  const { data, isLoading, isError } = useAskSummaryQuery(projectId, variant);

  if (isLoading) return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (isError) return <p className="text-sm text-critical">{t("loadError")}</p>;
  if (!data) return null;

  if (variant === "project_status" && data.project_status) {
    return <ProjectStatusSummaryView summary={data.project_status} onOpenCommitment={onOpenCommitment} />;
  }
  if (variant === "vendor_status" && data.vendor_status) {
    return <VendorStatusSummaryView summary={data.vendor_status} onOpenCommitment={onOpenCommitment} />;
  }
  if (variant === "decision_history" && data.decision_history) {
    return <DecisionHistorySummaryView summary={data.decision_history} onOpenCommitment={onOpenCommitment} />;
  }
  if (variant === "outstanding_actions" && data.outstanding_actions) {
    return (
      <OutstandingActionsSummaryView summary={data.outstanding_actions} onOpenCommitment={onOpenCommitment} />
    );
  }
  return null;
}
