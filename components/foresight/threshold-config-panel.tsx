"use client";

import { useState } from "react";

import {
  ForesightPermissionError,
  useCreateThresholdMutation,
  useDeleteThresholdMutation,
  useThresholdsQuery,
  useUpdateThresholdMutation,
} from "@/lib/foresight/hooks";
import type { ForesightThresholdMetric, ForesightThresholdOut } from "@/lib/api/types";

const METRICS: ForesightThresholdMetric[] = [
  "silence_multiplier",
  "escalation_hours",
  "forecast_slack_days",
];

// Mirrors backend/app/foresight/threshold.py's DEFAULT_THRESHOLDS exactly —
// a second, independent copy for display purposes only (same
// "judgment call, not a security boundary" posture lib/roles.ts's own
// WRITE_ROLES/ADMIN_ROLES duplication already documents), never read by any
// request this panel makes. This milestone's own NON-OBVIOUS note: these
// are what actually applies before any row exists — shown as the active
// default rather than an empty state implying no threshold is in effect.
const DEFAULTS: Record<ForesightThresholdMetric, number> = {
  silence_multiplier: 2.0,
  escalation_hours: 24.0,
  forecast_slack_days: 3.0,
};

const METRIC_LABEL: Record<ForesightThresholdMetric, string> = {
  silence_multiplier: "Silence Radar — multiple of a vendor's own response baseline",
  escalation_hours: "Escalation — hours unacknowledged before escalating",
  forecast_slack_days: "Forecast — milestone slack (days) treated as high miss-likelihood",
};

/**
 * FR-FOR-07: per-project, per-deviation-class thresholds. Org-admin gated
 * (app/api/foresight_admin.py's threshold_router uses
 * require_org_administrator, confirmed by reading it directly, not
 * assumed) — a genuinely different, org-wide access rule from every other
 * write action on this page, so a 403 here is expected for most write-role
 * viewers, not a bug; rendered as an explainable permission message, not a
 * generic failure.
 *
 * `deviation_class_term_id` scoping is deliberately not exposed here: same
 * `OntologyTermOut` id-omission gap `deviation-row.tsx` already documents
 * (no endpoint returns a deviation_class term's `id` to select by) — every
 * threshold this panel creates is metric x project-scope only, one axis
 * narrower than the backend model supports. `NULL` broadens (this
 * milestone's own NON-OBVIOUS note, same pattern RetentionPolicy already
 * established) — org-wide rows are grouped separately from this project's
 * own overrides so that relationship stays legible rather than a flat list.
 */
export function ThresholdConfigPanel({ projectId }: { projectId: string }) {
  const { data: thresholds, isLoading, isError, error } = useThresholdsQuery();
  const createMutation = useCreateThresholdMutation();
  const updateMutation = useUpdateThresholdMutation();
  const deleteMutation = useDeleteThresholdMutation();

  const [metric, setMetric] = useState<ForesightThresholdMetric>("silence_multiplier");
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<"org" | "project">("project");
  const [editingValue, setEditingValue] = useState<Record<string, string>>({});

  if (isLoading) return <p className="text-sm text-ink-muted">Loading thresholds…</p>;
  if (isError) {
    if (error instanceof ForesightPermissionError) {
      return (
        <p className="text-sm text-ink-muted">
          Threshold configuration is organisation-administrator only. You don&apos;t hold that role
          on any project in this organisation, so nothing here is editable for you.
        </p>
      );
    }
    return <p className="text-sm text-critical">Could not load thresholds. Please retry.</p>;
  }

  const orgWide = (thresholds ?? []).filter((t) => t.project_id === null);
  const thisProject = (thresholds ?? []).filter((t) => t.project_id === projectId);
  const otherProjects = (thresholds ?? []).filter(
    (t) => t.project_id !== null && t.project_id !== projectId,
  );

  function row(t: ForesightThresholdOut) {
    const editValue = editingValue[t.id] ?? String(t.value);
    return (
      <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
        <span className="text-ink">{METRIC_LABEL[t.metric]}</span>
        <span className="flex items-center gap-2">
          <input
            type="number"
            step="any"
            value={editValue}
            onChange={(e) => setEditingValue({ ...editingValue, [t.id]: e.target.value })}
            className="w-24 rounded-md border border-border bg-surface p-1 font-mono text-xs text-ink"
          />
          <button
            type="button"
            disabled={updateMutation.isPending || Number(editValue) === t.value}
            onClick={() => updateMutation.mutate({ thresholdId: t.id, value: Number(editValue) })}
            className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(t.id)}
            className="rounded-md border border-border-strong px-2 py-1 text-xs text-critical hover:border-critical disabled:opacity-50"
          >
            Remove override
          </button>
        </span>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">
          Organisation-wide defaults
        </p>
        <ul className="flex flex-col gap-1.5">
          {METRICS.map((m) => {
            const configured = orgWide.find((t) => t.metric === m);
            return configured ? (
              row(configured)
            ) : (
              <li key={m} className="rounded-md border border-dashed border-border p-2 text-sm text-ink-muted">
                {METRIC_LABEL[m]} — not configured, built-in default {DEFAULTS[m]} in effect
              </li>
            );
          })}
        </ul>
      </div>

      {thisProject.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">This project&apos;s overrides</p>
          <ul className="flex flex-col gap-1.5">{thisProject.map(row)}</ul>
        </div>
      )}

      {otherProjects.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">
            Overrides on other projects
          </p>
          <ul className="flex flex-col gap-1.5">{otherProjects.map(row)}</ul>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value) return;
          createMutation.mutate(
            { metric, value: Number(value), project_id: scope === "project" ? projectId : null },
            { onSuccess: () => setValue("") },
          );
        }}
        className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
      >
        <label className="text-xs text-ink-secondary">
          Metric
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as ForesightThresholdMetric)}
            className="mt-1 block w-64 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-secondary">
          Scope
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as "org" | "project")}
            className="mt-1 block w-44 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          >
            <option value="project">This project only</option>
            <option value="org">Organisation-wide</option>
          </select>
        </label>
        <label className="text-xs text-ink-secondary">
          Value
          <input
            required
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 block w-24 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Add override
        </button>
        {createMutation.isError && (
          <p className="w-full text-xs text-critical">Could not save — please retry.</p>
        )}
      </form>
    </div>
  );
}
