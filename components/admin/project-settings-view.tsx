"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  useUpdateWritebackConfigMutation,
  useWritebackConfigQuery,
} from "@/lib/writeback/hooks";
import {
  useCreateReportScheduleMutation,
  useDeleteReportScheduleMutation,
  useReportScheduleQuery,
  useUpdateReportScheduleMutation,
} from "@/lib/reports/hooks";
import { formatDateTime } from "@/lib/format";

import { SectionPanel } from "../living-wip/section-panel";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * WHAT TO BUILD #9/#10: write-back's daily ceiling (`PATCH .../writeback/
 * config`, ADMIN_ROLES-gated) and report schedule (FR-RPT-09/10, named in
 * F1's own EXPLICITLY OUT OF SCOPE as this console's job) — both project-
 * provisioning-adjacent settings, grouped on one screen per Prompt F7's own
 * instruction not to split them into unrelated standalone screens.
 */
export function ProjectSettingsView({ projectId }: { projectId: string }) {
  const t = useTranslations("admin.settings");
  const DAYS = DAY_KEYS.map((k) => t(`days.${k}`));
  const { data: writebackConfig } = useWritebackConfigQuery(projectId);
  const updateCeilingMutation = useUpdateWritebackConfigMutation(projectId);
  const [ceiling, setCeiling] = useState("");

  const { data: schedules } = useReportScheduleQuery(projectId);
  const createScheduleMutation = useCreateReportScheduleMutation(projectId);
  const updateScheduleMutation = useUpdateReportScheduleMutation(projectId);
  const deleteScheduleMutation = useDeleteReportScheduleMutation(projectId);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [hourLocal, setHourLocal] = useState("9");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel title={t("writebackTitle")}>
        <p className="mb-3 text-sm text-ink">
          {t("currentCeiling", { value: writebackConfig?.daily_ceiling ?? "—" })}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!ceiling) return;
            updateCeilingMutation.mutate(Number(ceiling), { onSuccess: () => setCeiling("") });
          }}
          className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
        >
          <label className="text-xs text-ink-secondary">
            {t("newCeilingLabel")}
            <input
              required
              type="number"
              min={1}
              value={ceiling}
              onChange={(e) => setCeiling(e.target.value)}
              className="mt-1 block w-28 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={updateCeilingMutation.isPending}
            className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {t("update")}
          </button>
          {updateCeilingMutation.isError && (
            <p className="w-full text-xs text-critical">{t("updateError")}</p>
          )}
        </form>
      </SectionPanel>

      <SectionPanel title={t("scheduleTitle")}>
        {(schedules ?? []).length === 0 && (
          <p className="mb-3 text-sm text-ink-muted">{t("noSchedules")}</p>
        )}
        {(schedules ?? []).length > 0 && (
          <ul className="mb-3 flex flex-col gap-1.5">
            {schedules!.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="text-ink">
                  {t("scheduleSummary", {
                    day: DAYS[s.day_of_week],
                    hour: String(s.hour_local).padStart(2, "0"),
                    minute: String(s.minute_local).padStart(2, "0"),
                    format: s.format.toUpperCase(),
                  })}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink-muted">
                    {s.last_run_at
                      ? t("lastRun", { date: formatDateTime(s.last_run_at) })
                      : t("neverRun")}
                  </span>
                  <button
                    type="button"
                    disabled={updateScheduleMutation.isPending}
                    onClick={() =>
                      updateScheduleMutation.mutate({ scheduleId: s.id, active: !s.active })
                    }
                    className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
                  >
                    {s.active ? t("pause") : t("resume")}
                  </button>
                  <button
                    type="button"
                    disabled={deleteScheduleMutation.isPending}
                    onClick={() => deleteScheduleMutation.mutate(s.id)}
                    className="rounded-md border border-border-strong px-2 py-1 text-xs text-critical hover:border-critical disabled:opacity-50"
                  >
                    {t("remove")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createScheduleMutation.mutate({
              day_of_week: Number(dayOfWeek),
              hour_local: Number(hourLocal),
            });
          }}
          className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
        >
          <label className="text-xs text-ink-secondary">
            {t("dayLabel")}
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="mt-1 block w-36 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            >
              {DAYS.map((d, i) => (
                <option key={DAY_KEYS[i]} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-secondary">
            {t("hourLabel")}
            <input
              required
              type="number"
              min={0}
              max={23}
              value={hourLocal}
              onChange={(e) => setHourLocal(e.target.value)}
              className="mt-1 block w-24 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={createScheduleMutation.isPending}
            className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {t("addSchedule")}
          </button>
          {createScheduleMutation.isError && (
            <p className="w-full text-xs text-critical">{t("addScheduleError")}</p>
          )}
        </form>
      </SectionPanel>
    </div>
  );
}
