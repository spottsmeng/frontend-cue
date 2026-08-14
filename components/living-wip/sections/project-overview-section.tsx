import { useTranslations } from "next-intl";

import type { ProjectOverviewSection as ProjectOverviewSectionT } from "@/lib/api/types";

import { EmptyState } from "../empty-state";
import { ReportField } from "../report-field";
import { SectionPanel } from "../section-panel";

export function ProjectOverviewPanel({
  section,
  onOpenCommitment,
}: {
  section: ProjectOverviewSectionT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const t = useTranslations("livingWip.projectOverview");
  return (
    <SectionPanel title={t("title")}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Row label={t("project")} field={section.project_name} onOpenCommitment={onOpenCommitment} />
        <Row label={t("client")} field={section.client_name} onOpenCommitment={onOpenCommitment} />
        <Row label={t("venue")} field={section.venue} onOpenCommitment={onOpenCommitment} />
        <Row
          label={t("eventStart")}
          field={section.event_start}
          kind="date"
          onOpenCommitment={onOpenCommitment}
        />
        <Row
          label={t("eventEnd")}
          field={section.event_end}
          kind="date"
          onOpenCommitment={onOpenCommitment}
        />
        <Row label={t("phase")} field={section.current_phase} onOpenCommitment={onOpenCommitment} />
      </dl>

      <div className="mt-4">
        {section.visual_references.length === 0 ? (
          <EmptyState message={t("noVisualReferences")} />
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {section.visual_references.map((ref) => (
              <li key={ref.deliverable_id} className="rounded-md border border-border p-2">
                {ref.available && ref.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed storage URL, not a local/optimizable asset
                  <img
                    src={ref.image_url}
                    alt={ref.deliverable_name}
                    className="mb-1 h-20 w-full rounded object-cover"
                  />
                ) : (
                  <p className="mb-1 text-xs italic text-ink-muted">
                    {t("notAvailable", { reason: ref.unavailable_reason ?? t("noSourceRecorded") })}
                  </p>
                )}
                <p className="truncate text-xs text-ink-secondary">{ref.deliverable_name}</p>
              </li>
            ))}
          </ul>
        )}
        {section.deliverables_without_visual_reference > 0 && (
          <p className="mt-2 text-xs text-ink-muted">
            {t("deliverablesWithoutVisual", {
              count: section.deliverables_without_visual_reference,
            })}
          </p>
        )}
      </div>
    </SectionPanel>
  );
}

function Row({
  label,
  field,
  kind = "text",
  onOpenCommitment,
}: {
  label: string;
  field: ProjectOverviewSectionT["project_name"];
  kind?: "text" | "date";
  onOpenCommitment: (commitmentId: string) => void;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5">
        <ReportField field={field} kind={kind} onOpenCommitment={onOpenCommitment} />
      </dd>
    </div>
  );
}
