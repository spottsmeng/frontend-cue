import { useTranslations } from "next-intl";

import { formatDate } from "@/lib/format";
import type { MilestoneTrackerRow } from "@/lib/api/types";

import { EmptyState } from "../empty-state";
import { ProvenanceChip } from "../provenance-chip";
import { SectionPanel } from "../section-panel";
import { StatusDot } from "../status-dot";

// F2 (Production Twin visualisation) owns the dependency-graph view,
// propagation simulator and milestone editing — this renders
// MilestoneTrackerRow as Living WIP's own read-only section only (status,
// slack, criticality), per this milestone's own EXPLICITLY OUT OF SCOPE
// note.
export function MilestoneTrackerPanel({ rows }: { rows: MilestoneTrackerRow[] }) {
  const t = useTranslations("livingWip.milestoneTracker");
  const STATUS: Record<
    MilestoneTrackerRow["status"],
    { tone: "good" | "warning" | "critical" | "muted"; label: string }
  > = {
    completed: { tone: "good", label: t("statusCompleted") },
    on_track: { tone: "good", label: t("statusOnTrack") },
    at_risk: { tone: "warning", label: t("statusAtRisk") },
    critical: { tone: "critical", label: t("statusCritical") },
    no_date: { tone: "muted", label: t("statusNoDate") },
  };

  return (
    <SectionPanel title={t("title")}>
      {rows.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((m) => {
            const status = STATUS[m.status];
            return (
              <li
                key={m.milestone_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2"
              >
                <span className="flex items-center gap-2 text-sm text-ink">
                  <StatusDot tone={status.tone} />
                  {m.name}
                  {m.is_critical && (
                    <span className="rounded-full bg-dusk-soft px-1.5 py-0.5 text-[10px] font-medium text-dusk">
                      {t("criticalPath")}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3 font-mono text-xs text-ink-muted">
                  <span>{status.label}</span>
                  <span>{t("planned", { date: formatDate(m.planned_at) })}</span>
                  {m.actual_at && <span>{t("actual", { date: formatDate(m.actual_at) })}</span>}
                  {m.slack_days !== null && (
                    <span>{t("slack", { days: m.slack_days })}</span>
                  )}
                  <ProvenanceChip provenance={[m.provenance]} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionPanel>
  );
}
