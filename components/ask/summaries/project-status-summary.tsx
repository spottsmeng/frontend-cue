import { useTranslations } from "next-intl";

import { ReportField } from "@/components/living-wip/report-field";
import type { ProjectStatusSummary as ProjectStatusSummaryT } from "@/lib/api/types";

export function ProjectStatusSummaryView({
  summary,
  onOpenCommitment,
}: {
  summary: ProjectStatusSummaryT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const t = useTranslations("ask.summaries.projectStatus");
  const rows: [string, keyof ProjectStatusSummaryT, "text" | "date"][] = [
    ["project", "project_name", "text"],
    ["openCommitments", "open_commitment_count", "text"],
    ["atRiskCommitments", "at_risk_commitment_count", "text"],
    ["openRisks", "open_risk_count", "text"],
    ["openDeviations", "open_deviation_count", "text"],
    ["nextMilestone", "next_milestone_name", "text"],
    ["nextMilestoneDue", "next_milestone_planned_at", "date"],
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map(([labelKey, key, kind]) => (
        <div key={key} className="rounded-md border border-border p-2.5">
          <dt className="text-xs uppercase tracking-wide text-ink-muted">{t(labelKey)}</dt>
          <dd className="mt-1">
            <ReportField field={summary[key]} kind={kind} onOpenCommitment={onOpenCommitment} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
