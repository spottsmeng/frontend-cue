"use client";

import { useState } from "react";

import type { DependencyOut, MembershipRole, MilestoneOut, MilestoneUpdate } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";
import { formatSlackDays, type TimelineNode } from "@/lib/twin/presentation";
import {
  useDeleteDependencyMutation,
  useDeleteMilestoneMutation,
  useUpdateMilestoneMutation,
} from "@/lib/twin/hooks";

import { DetailDrawer } from "../living-wip/detail-drawer";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FormState {
  name: string;
  planned_at: string;
  actual_at: string;
  is_fixed: boolean;
}

function formFromMilestone(m: MilestoneOut): FormState {
  return {
    name: m.name,
    planned_at: toDatetimeLocal(m.planned_at),
    actual_at: toDatetimeLocal(m.actual_at),
    is_fixed: m.is_fixed,
  };
}

/**
 * FR-TWN-01/10: milestone detail, CPM-derived slack (cross-referenced from
 * the Twin response — `MilestoneOut` itself doesn't carry it, this
 * milestone's own NON-OBVIOUS note), an audited-override edit form, and
 * delete — refusing locally with the specific blocking edges named, rather
 * than firing the DELETE and surfacing the backend's bare 409 string (this
 * milestone's own NON-OBVIOUS note: "remove N dependent edges first,
 * listing them, not a bare failed-request state").
 */
export function MilestoneDetailPanel({
  projectId,
  milestone,
  node,
  dependencies,
  milestonesById,
  effectiveRoles,
  onClose,
}: {
  projectId: string;
  milestone: MilestoneOut;
  node: TimelineNode | undefined;
  dependencies: DependencyOut[];
  milestonesById: Map<string, MilestoneOut>;
  effectiveRoles: MembershipRole[] | undefined;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => formFromMilestone(milestone));
  const [loadedFor, setLoadedFor] = useState(milestone.updated_at);
  if (milestone.updated_at !== loadedFor) {
    setLoadedFor(milestone.updated_at);
    setForm(formFromMilestone(milestone));
  }

  const updateMutation = useUpdateMilestoneMutation(projectId);
  const deleteMutation = useDeleteMilestoneMutation(projectId);
  const deleteEdgeMutation = useDeleteDependencyMutation(projectId);
  const canWrite = hasAnyRole(effectiveRoles, WRITE_ROLES);

  const blockingEdges = dependencies.filter(
    (d) => d.upstream_milestone_id === milestone.id || d.downstream_milestone_id === milestone.id,
  );

  function buildChanges(): MilestoneUpdate {
    const changes: MilestoneUpdate = {};
    if (form.name !== milestone.name) changes.name = form.name;
    if (form.planned_at !== toDatetimeLocal(milestone.planned_at)) {
      changes.planned_at = form.planned_at ? new Date(form.planned_at).toISOString() : null;
    }
    if (form.actual_at !== toDatetimeLocal(milestone.actual_at)) {
      changes.actual_at = form.actual_at ? new Date(form.actual_at).toISOString() : null;
    }
    if (form.is_fixed !== milestone.is_fixed) changes.is_fixed = form.is_fixed;
    return changes;
  }

  return (
    <DetailDrawer title="Milestone" onClose={onClose}>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-ink">{milestone.name}</h3>
          {milestone.is_fixed && (
            <span className="rounded-full bg-surface-sunk px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
              🔒 fixed
            </span>
          )}
          {node?.isCritical && (
            <span className="rounded-full bg-critical-soft px-1.5 py-0.5 text-[10px] font-medium text-critical">
              critical path
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          earliest {formatDateTime(node?.earliest ?? null)} · latest {formatDateTime(node?.latest ?? null)} ·{" "}
          <span className={node?.isCritical ? "text-critical" : undefined}>
            {formatSlackDays(node?.slackDays ?? null)}
          </span>
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Slack and critical-path status come from the seeded archetype plus any PM overrides —
          CUE hasn&rsquo;t learned duration distributions from history (FR-TWN-08 is not built).
        </p>
      </div>

      <section>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
          {canWrite ? "Edit (recorded as an override)" : "Details"}
        </h4>
        {canWrite ? (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-ink-secondary">
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
              />
            </label>
            <div className="flex gap-2">
              <label className="flex-1 text-xs text-ink-secondary">
                Planned
                <input
                  type="datetime-local"
                  value={form.planned_at}
                  onChange={(e) => setForm({ ...form, planned_at: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
                />
              </label>
              <label className="flex-1 text-xs text-ink-secondary">
                Actual
                <input
                  type="datetime-local"
                  value={form.actual_at}
                  onChange={(e) => setForm({ ...form, actual_at: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
                />
              </label>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <input
                type="checkbox"
                checked={form.is_fixed}
                onChange={(e) => setForm({ ...form, is_fixed: e.target.checked })}
              />
              Fixed — cannot be pushed by an upstream slip (FR-TWN-11)
            </label>
            <button
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => {
                const changes = buildChanges();
                if (Object.keys(changes).length === 0) return;
                updateMutation.mutate({ milestoneId: milestone.id, body: changes });
              }}
              className="mt-1 self-start rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {updateMutation.isPending ? "Saving override…" : "Save override"}
            </button>
            {updateMutation.isError && <p className="text-xs text-critical">Could not save.</p>}
            {updateMutation.isSuccess && <p className="text-xs text-good">Saved — recorded in the Twin audit trail.</p>}
          </div>
        ) : (
          <p className="text-sm text-ink-secondary">
            Project-manager, producer, finance, account-manager, designer or administrator role
            required to override.
          </p>
        )}
      </section>

      {canWrite && (
        <section>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Delete</h4>
          {blockingEdges.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-warning">
                Remove {blockingEdges.length} dependent {blockingEdges.length === 1 ? "edge" : "edges"} first —
                a milestone still referenced by a dependency can&rsquo;t be deleted (a deliberate, separate step).
              </p>
              <ul className="flex flex-col gap-1">
                {blockingEdges.map((edge) => {
                  const other =
                    edge.upstream_milestone_id === milestone.id
                      ? milestonesById.get(edge.downstream_milestone_id)
                      : milestonesById.get(edge.upstream_milestone_id);
                  const direction = edge.upstream_milestone_id === milestone.id ? "→" : "←";
                  return (
                    <li
                      key={edge.id}
                      className="flex items-center justify-between rounded-md border border-border p-2 text-xs"
                    >
                      <span className="text-ink-secondary">
                        {direction} {other?.name ?? "unknown milestone"} (lag {edge.lag_days}d)
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteEdgeMutation.mutate(edge.id)}
                        disabled={deleteEdgeMutation.isPending}
                        className="rounded-md border border-border-strong px-2 py-1 text-critical hover:border-critical disabled:opacity-50"
                      >
                        Remove edge
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(milestone.id, { onSuccess: onClose })}
              className="rounded-md border border-critical px-3 py-1.5 text-xs text-critical hover:bg-critical-soft disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete milestone"}
            </button>
          )}
          {deleteMutation.isError && (
            <p className="mt-2 text-xs text-critical">
              Could not delete — it may still be referenced by a dependency.
            </p>
          )}
        </section>
      )}
    </DetailDrawer>
  );
}
