"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { MembershipRole, RiskSeverity, RiskSource, RiskStatus } from "@/lib/api/types";
import { useRiskFeedQuery, type RiskFilters } from "@/lib/foresight/hooks";

import { EmptyState } from "../living-wip/empty-state";
import { RiskCard } from "./risk-card";

const STATUS_OPTIONS: RiskStatus[] = ["open", "acknowledged", "resolved", "superseded"];
const SOURCE_OPTIONS: RiskSource[] = ["silence", "contradiction", "forecast"];
const SEVERITY_OPTIONS: RiskSeverity[] = ["low", "medium", "high", "critical"];

/**
 * FR-FOR-01–10: the filterable Risk feed. Filters are sent as the
 * endpoint's own query params (app/api/risks.py's list_risks) — this
 * milestone's own instruction against fetching everything and filtering
 * client-side, so each filter change is a fresh, server-scoped request.
 */
export function RiskFeed({
  projectId,
  effectiveRoles,
}: {
  projectId: string;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("foresight.riskFeed");
  const [filters, setFilters] = useState<RiskFilters>({});
  const { data: risks, isLoading, isError } = useRiskFeedQuery(projectId, filters);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <label className="text-xs text-ink-secondary">
          {t("status")}
          <select
            value={filters.status ?? ""}
            onChange={(e) =>
              setFilters({ ...filters, status: (e.target.value || undefined) as RiskStatus | undefined })
            }
            className="mt-1 block w-40 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          >
            <option value="">{t("allStatuses")}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-secondary">
          {t("source")}
          <select
            value={filters.source ?? ""}
            onChange={(e) =>
              setFilters({ ...filters, source: (e.target.value || undefined) as RiskSource | undefined })
            }
            className="mt-1 block w-40 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          >
            <option value="">{t("allSources")}</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-secondary">
          {t("severity")}
          <select
            value={filters.severity ?? ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                severity: (e.target.value || undefined) as RiskSeverity | undefined,
              })
            }
            className="mt-1 block w-40 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          >
            <option value="">{t("allSeverities")}</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <p className="text-sm text-ink-muted">{t("loading")}</p>}
      {isError && <p className="text-sm text-critical">{t("error")}</p>}
      {risks && risks.length === 0 && (
        <EmptyState message={t("empty")} />
      )}
      {risks && risks.length > 0 && (
        <ul className="flex flex-col gap-2">
          {risks.map((risk) => (
            <RiskCard key={risk.id} projectId={projectId} risk={risk} effectiveRoles={effectiveRoles} />
          ))}
        </ul>
      )}
    </div>
  );
}
