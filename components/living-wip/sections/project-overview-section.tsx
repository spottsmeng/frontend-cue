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
  return (
    <SectionPanel title="Project overview">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Row label="Project" field={section.project_name} onOpenCommitment={onOpenCommitment} />
        <Row label="Client" field={section.client_name} onOpenCommitment={onOpenCommitment} />
        <Row label="Venue" field={section.venue} onOpenCommitment={onOpenCommitment} />
        <Row label="Event start" field={section.event_start} kind="date" onOpenCommitment={onOpenCommitment} />
        <Row label="Event end" field={section.event_end} kind="date" onOpenCommitment={onOpenCommitment} />
        <Row label="Phase" field={section.current_phase} onOpenCommitment={onOpenCommitment} />
      </dl>

      <div className="mt-4">
        {section.visual_references.length === 0 ? (
          <EmptyState message="No visual references linked to any deliverable yet." />
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
                    Not available — {ref.unavailable_reason ?? "no source recorded"}
                  </p>
                )}
                <p className="truncate text-xs text-ink-secondary">{ref.deliverable_name}</p>
              </li>
            ))}
          </ul>
        )}
        {section.deliverables_without_visual_reference > 0 && (
          <p className="mt-2 text-xs text-ink-muted">
            {section.deliverables_without_visual_reference} deliverable
            {section.deliverables_without_visual_reference === 1 ? "" : "s"} still without a linked
            visual reference.
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
