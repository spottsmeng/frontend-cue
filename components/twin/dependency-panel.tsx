"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { DependencyOut, MembershipRole, MilestoneOut } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";
import {
  TwinConflictError,
  useCreateDependencyMutation,
  useDeleteDependencyMutation,
  useUpdateDependencyMutation,
} from "@/lib/twin/hooks";

import { EmptyState } from "../living-wip/empty-state";

/**
 * FR-TWN-01/10: the dependency graph's own edges — list, add, edit
 * `lag_days`, delete. A create that would introduce a cycle 422s
 * (FR-TWN-01 requires a DAG); rendered here as an explainable inline
 * message using the backend's own detail string, not re-derived
 * client-side (this milestone's own NON-OBVIOUS note: the 422 body doesn't
 * name which milestones form the loop, which is worth flagging in
 * frontend/PROGRESS.md as a backend-response-shape gap, not worked around).
 */
export function DependencyPanel({
  projectId,
  milestones,
  dependencies,
  effectiveRoles,
}: {
  projectId: string;
  milestones: MilestoneOut[];
  dependencies: DependencyOut[];
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("twin.dependencyPanel");
  const milestonesById = new Map(milestones.map((m) => [m.id, m]));
  const canWrite = hasAnyRole(effectiveRoles, WRITE_ROLES);

  const [upstreamId, setUpstreamId] = useState("");
  const [downstreamId, setDownstreamId] = useState("");
  const [lagDays, setLagDays] = useState("0");
  const [cycleError, setCycleError] = useState<string | null>(null);
  const createMutation = useCreateDependencyMutation(projectId);
  const deleteMutation = useDeleteDependencyMutation(projectId);
  const updateMutation = useUpdateDependencyMutation(projectId);
  const [editingLag, setEditingLag] = useState<Record<string, string>>({});

  return (
    <div className="flex flex-col gap-3">
      {dependencies.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {dependencies.map((edge) => {
            const upstream = milestonesById.get(edge.upstream_milestone_id);
            const downstream = milestonesById.get(edge.downstream_milestone_id);
            const lagValue = editingLag[edge.id] ?? String(edge.lag_days);
            return (
              <li
                key={edge.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
              >
                <span className="text-ink">
                  {upstream?.name ?? t("unknownMilestone")} <span className="text-ink-muted">→</span>{" "}
                  {downstream?.name ?? t("unknownMilestone")}
                </span>
                {canWrite ? (
                  <span className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-ink-secondary">
                      {t("lagPrefix")}
                      <input
                        type="number"
                        min={0}
                        value={lagValue}
                        onChange={(e) =>
                          setEditingLag({ ...editingLag, [edge.id]: e.target.value })
                        }
                        className="w-16 rounded-md border border-border bg-surface p-1 font-mono text-xs text-ink"
                      />
                      {t("lagSuffix")}
                    </label>
                    <button
                      type="button"
                      disabled={updateMutation.isPending || Number(lagValue) === edge.lag_days}
                      onClick={() =>
                        updateMutation.mutate({
                          dependencyId: edge.id,
                          body: { lag_days: Number(lagValue) },
                        })
                      }
                      className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
                    >
                      {t("save")}
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(edge.id)}
                      className="rounded-md border border-border-strong px-2 py-1 text-xs text-critical hover:border-critical disabled:opacity-50"
                    >
                      {t("remove")}
                    </button>
                  </span>
                ) : (
                  <span className="font-mono text-xs text-ink-muted">{t("lagDays", { days: edge.lag_days })}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canWrite && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCycleError(null);
            if (!upstreamId || !downstreamId || upstreamId === downstreamId) return;
            createMutation.mutate(
              {
                upstream_milestone_id: upstreamId,
                downstream_milestone_id: downstreamId,
                lag_days: Number(lagDays) || 0,
              },
              {
                onSuccess: () => {
                  setUpstreamId("");
                  setDownstreamId("");
                  setLagDays("0");
                },
                onError: (error) => {
                  if (error instanceof TwinConflictError) {
                    setCycleError(error.message);
                  }
                },
              },
            );
          }}
          className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
        >
          <label className="text-xs text-ink-secondary">
            {t("upstream")}
            <select
              required
              value={upstreamId}
              onChange={(e) => setUpstreamId(e.target.value)}
              className="mt-1 block w-48 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            >
              <option value="" disabled>
                {t("select")}
              </option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <span aria-hidden className="pb-2 text-ink-muted">
            →
          </span>
          <label className="text-xs text-ink-secondary">
            {t("downstream")}
            <select
              required
              value={downstreamId}
              onChange={(e) => setDownstreamId(e.target.value)}
              className="mt-1 block w-48 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            >
              <option value="" disabled>
                {t("select")}
              </option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-secondary">
            {t("lagDaysLabel")}
            <input
              type="number"
              min={0}
              value={lagDays}
              onChange={(e) => setLagDays(e.target.value)}
              className="mt-1 block w-20 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? t("adding") : t("add")}
          </button>
          {cycleError && (
            <p className="w-full text-xs text-critical">
              {t("rejected", { error: cycleError })}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
