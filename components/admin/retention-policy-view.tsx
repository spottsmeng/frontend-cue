"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AdminPermissionError } from "@/lib/admin/members-hooks";
import { useAdminProjectsQuery } from "@/lib/admin/projects-hooks";
import {
  useCreateRetentionPolicyMutation,
  useDeleteRetentionPolicyMutation,
  useRetentionPoliciesQuery,
  useUpdateRetentionPolicyMutation,
} from "@/lib/admin/retention-hooks";
import type { RetentionPolicyOut } from "@/lib/api/types";

import { SectionPanel } from "../living-wip/section-panel";

/**
 * FR-ADM-08: org x vertical x region -> a single `retention_days`, NULL
 * broadening — the same narrowing/broadening shape
 * `ThresholdConfigPanel` (`components/foresight/threshold-config-panel.tsx`)
 * already established, reused rather than reinvented (Prompt F7's own
 * NON-OBVIOUS note). No vertical *picker* beyond "all verticals" / "this
 * organisation's vertical" — confirmed by reading `app/models/vertical.py`
 * directly: exactly one vertical (`event-production`) is seeded in the
 * whole system at v1, and there is no `GET /verticals` endpoint at all, so
 * a real dropdown would only ever offer one option (same judgment call
 * `ProjectProvisioningForm` makes for `vertical_code`/`archetype_code`). Its
 * id is discovered the same honest way `lib/vendors/hooks.ts`'s
 * `distinctArchetypeCodes` discovers real archetype codes: any already-
 * fetched `ProjectOut.vertical_id`, never fabricated.
 */
export function RetentionPolicyView() {
  const t = useTranslations("admin.retention");
  const { data: policies, isLoading, isError, error } = useRetentionPoliciesQuery();
  const { data: projects } = useAdminProjectsQuery();
  const knownVerticalId = projects?.[0]?.vertical_id;
  const createMutation = useCreateRetentionPolicyMutation();
  const updateMutation = useUpdateRetentionPolicyMutation();
  const deleteMutation = useDeleteRetentionPolicyMutation();

  const [scope, setScope] = useState<"all" | "vertical">("all");
  const [region, setRegion] = useState("");
  const [days, setDays] = useState("365");
  const [editingDays, setEditingDays] = useState<Record<string, string>>({});

  function row(p: RetentionPolicyOut) {
    const editValue = editingDays[p.id] ?? String(p.retention_days);
    return (
      <li
        key={p.id}
        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
      >
        <span className="text-ink">
          {p.vertical_id ? t("orgVertical") : t("allVerticals")}
          {" · "}
          {p.region ?? t("allRegions")}
        </span>
        <span className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={editValue}
            onChange={(e) => setEditingDays({ ...editingDays, [p.id]: e.target.value })}
            className="w-24 rounded-md border border-border bg-surface p-1 font-mono text-xs text-ink"
          />
          <span className="text-xs text-ink-muted">{t("daysUnit")}</span>
          <button
            type="button"
            disabled={updateMutation.isPending || Number(editValue) === p.retention_days}
            onClick={() =>
              updateMutation.mutate({ policyId: p.id, retentionDays: Number(editValue) })
            }
            className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
          >
            {t("save")}
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(p.id)}
            className="rounded-md border border-border-strong px-2 py-1 text-xs text-critical hover:border-critical disabled:opacity-50"
          >
            {t("remove")}
          </button>
        </span>
      </li>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel title={t("title")}>
        {isLoading && <p className="text-sm text-ink-muted">{t("loading")}</p>}
        {isError &&
          (error instanceof AdminPermissionError ? (
            <p className="text-sm text-ink-muted">{t("adminOnly")}</p>
          ) : (
            <p className="text-sm text-critical">{t("loadError")}</p>
          ))}
        {policies && (
          <div className="flex flex-col gap-4">
            {policies.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("empty")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">{policies.map(row)}</ul>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!days) return;
                createMutation.mutate(
                  {
                    vertical_id: scope === "vertical" ? (knownVerticalId ?? null) : null,
                    region: region || null,
                    retention_days: Number(days),
                  },
                  { onSuccess: () => setRegion("") },
                );
              }}
              className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
            >
              <label className="text-xs text-ink-secondary">
                {t("verticalScopeLabel")}
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as "all" | "vertical")}
                  className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
                >
                  <option value="all">{t("allVerticals")}</option>
                  <option value="vertical" disabled={!knownVerticalId}>
                    {t("orgVertical")}
                  </option>
                </select>
              </label>
              <label className="text-xs text-ink-secondary">
                {t("regionLabel")}
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder={t("regionPlaceholder")}
                  className="mt-1 block w-32 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
                />
              </label>
              <label className="text-xs text-ink-secondary">
                {t("retentionDaysLabel")}
                <input
                  required
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="mt-1 block w-28 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
                />
              </label>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {t("addPolicy")}
              </button>
              {createMutation.isError && (
                <p className="w-full text-xs text-critical">{t("saveError")}</p>
              )}
            </form>
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
