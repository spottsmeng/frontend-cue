"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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

const METRIC_LABEL_KEY: Record<ForesightThresholdMetric, "silenceMultiplier" | "escalationHours" | "forecastSlackDays"> = {
  silence_multiplier: "silenceMultiplier",
  escalation_hours: "escalationHours",
  forecast_slack_days: "forecastSlackDays",
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
  const t = useTranslations("foresight.thresholdConfigPanel");
  const { data: thresholds, isLoading, isError, error } = useThresholdsQuery();
  const createMutation = useCreateThresholdMutation();
  const updateMutation = useUpdateThresholdMutation();
  const deleteMutation = useDeleteThresholdMutation();

  const [metric, setMetric] = useState<ForesightThresholdMetric>("silence_multiplier");
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<"org" | "project">("project");
  const [editingValue, setEditingValue] = useState<Record<string, string>>({});

  if (isLoading) return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (isError) {
    if (error instanceof ForesightPermissionError) {
      return (
        <p className="text-sm text-ink-muted">
          {t("permissionError")}
        </p>
      );
    }
    return <p className="text-sm text-critical">{t("loadError")}</p>;
  }

  const orgWide = (thresholds ?? []).filter((th) => th.project_id === null);
  const thisProject = (thresholds ?? []).filter((th) => th.project_id === projectId);
  const otherProjects = (thresholds ?? []).filter(
    (th) => th.project_id !== null && th.project_id !== projectId,
  );

  function row(threshold: ForesightThresholdOut) {
    const editValue = editingValue[threshold.id] ?? String(threshold.value);
    return (
      <li key={threshold.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
        <span className="text-ink">{t(`metricLabel.${METRIC_LABEL_KEY[threshold.metric]}`)}</span>
        <span className="flex items-center gap-2">
          <input
            type="number"
            step="any"
            value={editValue}
            onChange={(e) => setEditingValue({ ...editingValue, [threshold.id]: e.target.value })}
            className="w-24 rounded-md border border-border bg-surface p-1 font-mono text-xs text-ink"
          />
          <button
            type="button"
            disabled={updateMutation.isPending || Number(editValue) === threshold.value}
            onClick={() => updateMutation.mutate({ thresholdId: threshold.id, value: Number(editValue) })}
            className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
          >
            {t("save")}
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(threshold.id)}
            className="rounded-md border border-border-strong px-2 py-1 text-xs text-critical hover:border-critical disabled:opacity-50"
          >
            {t("removeOverride")}
          </button>
        </span>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">
          {t("orgWideDefaults")}
        </p>
        <ul className="flex flex-col gap-1.5">
          {METRICS.map((m) => {
            const configured = orgWide.find((th) => th.metric === m);
            return configured ? (
              row(configured)
            ) : (
              <li key={m} className="rounded-md border border-dashed border-border p-2 text-sm text-ink-muted">
                {t("notConfigured", { label: t(`metricLabel.${METRIC_LABEL_KEY[m]}`), value: DEFAULTS[m] })}
              </li>
            );
          })}
        </ul>
      </div>

      {thisProject.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">{t("thisProjectOverrides")}</p>
          <ul className="flex flex-col gap-1.5">{thisProject.map(row)}</ul>
        </div>
      )}

      {otherProjects.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">
            {t("otherProjectOverrides")}
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
          {t("metric")}
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
          {t("scope")}
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as "org" | "project")}
            className="mt-1 block w-44 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          >
            <option value="project">{t("scopeProject")}</option>
            <option value="org">{t("scopeOrg")}</option>
          </select>
        </label>
        <label className="text-xs text-ink-secondary">
          {t("value")}
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
          {t("addOverride")}
        </button>
        {createMutation.isError && (
          <p className="w-full text-xs text-critical">{t("saveError")}</p>
        )}
      </form>
    </div>
  );
}
