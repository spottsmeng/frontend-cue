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
const STATUS: Record<
  MilestoneTrackerRow["status"],
  { tone: "good" | "warning" | "critical" | "muted"; label: string }
> = {
  completed: { tone: "good", label: "Completed" },
  on_track: { tone: "good", label: "On track" },
  at_risk: { tone: "warning", label: "At risk" },
  critical: { tone: "critical", label: "Critical" },
  no_date: { tone: "muted", label: "No date" },
};

export function MilestoneTrackerPanel({ rows }: { rows: MilestoneTrackerRow[] }) {
  return (
    <SectionPanel title="Milestone tracker">
      {rows.length === 0 ? (
        <EmptyState message="No milestones seeded for this project yet." />
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
                      critical path
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3 font-mono text-xs text-ink-muted">
                  <span>{status.label}</span>
                  <span>planned {formatDate(m.planned_at)}</span>
                  {m.actual_at && <span>actual {formatDate(m.actual_at)}</span>}
                  {m.slack_days !== null && <span>slack {m.slack_days}d</span>}
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
