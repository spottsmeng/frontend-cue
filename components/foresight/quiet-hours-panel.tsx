"use client";

import { useTranslations } from "next-intl";

import { useQuietHoursQuery, useSetQuietHoursMutation } from "@/lib/foresight/hooks";
import type { MembershipRole, QuietHoursConfigOut, RiskSeverity } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";

const SEVERITIES: RiskSeverity[] = ["low", "medium", "high", "critical"];

function toTimeInput(value: string): string {
  return value.slice(0, 5); // "HH:MM:SS" -> "HH:MM" for <input type="time">
}

/**
 * FR-NTF-04 — one config per project (`QuietHoursConfig.project_id`'s own
 * unique constraint), not a personal notification-preferences screen (this
 * milestone's own NON-OBVIOUS note). `PUT` is an upsert, so this panel
 * never needs to know whether a row already exists before saving.
 */
export function QuietHoursPanel({
  projectId,
  effectiveRoles,
}: {
  projectId: string;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("foresight.quietHoursPanel");
  const { data: config, isLoading, isError } = useQuietHoursQuery(projectId);

  if (isLoading) return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (isError) return <p className="text-sm text-critical">{t("error")}</p>;

  // Keyed by whether a row exists yet, so the form's own uncontrolled
  // defaultValue inputs (below) remount and re-derive from the just-loaded
  // `config` exactly once, rather than syncing fetched data into state via
  // a useEffect (react-hooks/set-state-in-effect's own "derive during
  // render, don't setState from an effect" guidance).
  return (
    <QuietHoursForm
      key={config?.id ?? "unset"}
      projectId={projectId}
      config={config ?? null}
      canWrite={hasAnyRole(effectiveRoles, WRITE_ROLES)}
    />
  );
}

function QuietHoursForm({
  projectId,
  config,
  canWrite,
}: {
  projectId: string;
  config: QuietHoursConfigOut | null;
  canWrite: boolean;
}) {
  const t = useTranslations("foresight.quietHoursPanel");
  const setMutation = useSetQuietHoursMutation(projectId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setMutation.mutate({
          quiet_start_local: `${form.get("start")}:00`,
          quiet_end_local: `${form.get("end")}:00`,
          critical_severity_threshold: form.get("threshold") as RiskSeverity,
        });
      }}
      className="flex flex-col gap-3"
    >
      {!config && (
        <p className="text-xs text-ink-muted">
          {t("nothingConfigured")}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-ink-secondary">
          {t("startLabel")}
          <input
            name="start"
            type="time"
            required
            disabled={!canWrite}
            defaultValue={config ? toTimeInput(config.quiet_start_local) : "22:00"}
            className="mt-1 block rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink disabled:opacity-60"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("endLabel")}
          <input
            name="end"
            type="time"
            required
            disabled={!canWrite}
            defaultValue={config ? toTimeInput(config.quiet_end_local) : "08:00"}
            className="mt-1 block rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink disabled:opacity-60"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("thresholdLabel")}
          <select
            name="threshold"
            disabled={!canWrite}
            defaultValue={config?.critical_severity_threshold ?? "critical"}
            className="mt-1 block w-32 rounded-md border border-border bg-surface p-1.5 text-sm text-ink disabled:opacity-60"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-[11px] text-ink-muted">
        {t("explanation")}
      </p>
      {canWrite && (
        <button
          type="submit"
          disabled={setMutation.isPending}
          className="self-start rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {setMutation.isPending ? t("saving") : t("save")}
        </button>
      )}
      {setMutation.isError && <p className="text-xs text-critical">{t("saveError")}</p>}
    </form>
  );
}
