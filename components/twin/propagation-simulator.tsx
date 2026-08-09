"use client";

import { useState } from "react";

import type { MilestoneOut } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { usePropagateMutation } from "@/lib/twin/hooks";

interface CandidateRow {
  key: string;
  milestoneId: string;
  newDate: string;
}

function emptyRow(): CandidateRow {
  return { key: crypto.randomUUID(), milestoneId: "", newDate: "" };
}

/**
 * FR-TWN-05/06/07: "what if X slips" — one candidate is the ordinary case;
 * more than one, submitted in the same `/twin/propagate` call, is FR-TWN-07's
 * own "recovery options" side-by-side comparison (app/twin/graph.py's
 * propagate() docstring: "there is no separate endpoint or function for
 * that"). `usePropagateMutation` never invalidates any cached query — a
 * pure read, nothing persisted (app/api/twin.py's own docstring) — so the
 * "nothing here is real" framing below is load-bearing UI copy, not
 * decoration.
 */
export function PropagationSimulator({
  projectId,
  milestones,
  currentBindingConstraintId,
}: {
  projectId: string;
  milestones: MilestoneOut[];
  currentBindingConstraintId: string | null;
}) {
  const [rows, setRows] = useState<CandidateRow[]>([emptyRow()]);
  const propagateMutation = usePropagateMutation(projectId);
  const milestonesById = new Map(milestones.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-md border border-dusk bg-dusk-soft px-3 py-2 text-xs text-dusk">
        Simulation only — this never writes anything. Every candidate below is explored, not saved;
        nothing on this project changes until a PM edits a milestone directly.
      </p>

      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={row.key} className="flex flex-wrap items-end gap-2 rounded-md border border-border p-2">
            <label className="text-xs text-ink-secondary">
              If milestone
              <select
                value={row.milestoneId}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, milestoneId: e.target.value };
                  setRows(next);
                }}
                className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
              >
                <option value="" disabled>
                  Select…
                </option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-secondary">
              lands on
              <input
                type="datetime-local"
                value={row.newDate}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, newDate: e.target.value };
                  setRows(next);
                }}
                className="mt-1 block w-48 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
              />
            </label>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                className="rounded-md border border-border-strong px-2 py-1.5 text-xs text-ink-secondary"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRows([...rows, emptyRow()])}
            className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary hover:border-signal hover:text-signal"
          >
            + Add another candidate (compare side by side)
          </button>
          <button
            type="button"
            disabled={propagateMutation.isPending || rows.some((r) => !r.milestoneId || !r.newDate)}
            onClick={() =>
              propagateMutation.mutate(
                rows.map((r) => ({
                  milestone_id: r.milestoneId,
                  new_date: new Date(r.newDate).toISOString(),
                })),
              )
            }
            className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {propagateMutation.isPending ? "Simulating…" : "Run simulation"}
          </button>
        </div>
        {propagateMutation.isError && (
          <p className="text-xs text-critical">Could not run the simulation.</p>
        )}
      </div>

      {propagateMutation.data && (
        <div className="flex flex-wrap gap-3">
          {propagateMutation.data.results.map((result, i) => {
            const shifted = milestonesById.get(result.milestone_id);
            const constraintAfter = result.binding_constraint_after
              ? milestonesById.get(result.binding_constraint_after)
              : null;
            const constraintChanged = result.binding_constraint_after !== currentBindingConstraintId;
            return (
              <div
                key={i}
                className="flex min-w-64 flex-1 flex-col gap-2 rounded-md border border-border-strong p-3"
              >
                <h5 className="text-xs font-semibold text-ink">
                  {shifted?.name ?? "milestone"} → {formatDateTime(result.new_date)}
                </h5>
                <p className="text-xs text-ink-secondary">
                  Binding constraint after this shift:{" "}
                  <span className={constraintChanged ? "font-medium text-dusk" : "text-ink"}>
                    {constraintAfter?.name ?? "none"}
                  </span>
                  {constraintChanged && (
                    <span className="ml-1 text-dusk">(changed from the current graph)</span>
                  )}
                </p>
                <ul className="flex flex-col gap-1">
                  {result.affected.map((a) => {
                    const affectedMilestone = milestonesById.get(a.milestone_id);
                    return (
                      <li
                        key={a.milestone_id}
                        className="flex flex-col gap-0.5 rounded-md bg-surface-sunk p-1.5 text-xs"
                      >
                        <span className="text-ink">
                          {affectedMilestone?.name ?? "unknown"}
                          {a.propagation_stopped && (
                            <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[10px] text-ink-muted">
                              🔒 stopped here (fixed)
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-[11px] text-ink-muted">
                          {formatDateTime(a.previous_earliest)} → {formatDateTime(a.new_earliest)} ·
                          consumed {a.consumed_slack_days !== null ? `${a.consumed_slack_days.toFixed(1)}d` : "—"}{" "}
                          slack
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
