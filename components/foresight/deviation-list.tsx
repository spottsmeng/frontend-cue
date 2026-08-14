"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useDeviationsQuery } from "@/lib/deviations/hooks";
import { useDeviationClassTermsQuery } from "@/lib/foresight/hooks";
import { useProjectMembersQuery } from "@/lib/members/hooks";
import type { DeviationStatus, MembershipRole } from "@/lib/api/types";

import { EmptyState } from "../living-wip/empty-state";
import { DeviationRow } from "./deviation-row";

const STATUS_OPTIONS: DeviationStatus[] = ["auto_drafted", "confirmed", "resolved"];

/**
 * FR-DEV-01–05: scope changes, delays and corrective actions — list/detail/
 * confirm/resolve. Fetches `classTerms` (for resolving `class_term_id` to a
 * label) and `members` (for the resolve-owner picker) once here and passes
 * both down to every row, rather than each row re-fetching the same
 * reference data independently.
 */
export function DeviationList({
  projectId,
  effectiveRoles,
}: {
  projectId: string;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("foresight.deviationList");
  const [status, setStatus] = useState<DeviationStatus | undefined>(undefined);
  const { data: deviations, isLoading, isError } = useDeviationsQuery(projectId, status);
  const { data: classTerms } = useDeviationClassTermsQuery(projectId);
  const { data: members } = useProjectMembersQuery(projectId);

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-ink-secondary">
        {t("status")}
        <select
          value={status ?? ""}
          onChange={(e) => setStatus((e.target.value || undefined) as DeviationStatus | undefined)}
          className="mt-1 block w-48 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
        >
          <option value="">{t("allStatuses")}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {isLoading && <p className="text-sm text-ink-muted">{t("loading")}</p>}
      {isError && <p className="text-sm text-critical">{t("error")}</p>}
      {deviations && deviations.length === 0 && (
        <EmptyState message={t("empty")} />
      )}
      {deviations && deviations.length > 0 && (
        <ul className="flex flex-col gap-2">
          {deviations.map((d) => (
            <DeviationRow
              key={d.id}
              projectId={projectId}
              deviation={d}
              effectiveRoles={effectiveRoles}
              classTerms={classTerms}
              members={members}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
