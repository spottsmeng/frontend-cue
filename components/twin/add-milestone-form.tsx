"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { MembershipRole } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";
import { useCreateMilestoneMutation, useMilestoneTypeTermsQuery } from "@/lib/twin/hooks";

/**
 * FR-TWN-01/10's "add a milestone the archetype didn't have". `type_code`
 * comes from `GET /projects/{id}/ontology-terms?category=milestone_type`
 * (this milestone's own NON-OBVIOUS note: never hardcode CUE-PRD.md §4.2's
 * term list here — it would silently drift from the backend's own
 * versioned reference data).
 */
export function AddMilestoneForm({
  projectId,
  effectiveRoles,
}: {
  projectId: string;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("twin.addMilestoneForm");
  const [open, setOpen] = useState(false);
  const [typeCode, setTypeCode] = useState("");
  const [name, setName] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [isFixed, setIsFixed] = useState(false);
  const { data: types } = useMilestoneTypeTermsQuery(projectId);
  const createMutation = useCreateMilestoneMutation(projectId);

  if (!hasAnyRole(effectiveRoles, WRITE_ROLES)) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary hover:border-signal hover:text-signal"
      >
        {t("addMilestone")}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!typeCode || !name) return;
        createMutation.mutate(
          {
            type_code: typeCode,
            name,
            planned_at: plannedAt ? new Date(plannedAt).toISOString() : null,
            is_fixed: isFixed,
          },
          {
            onSuccess: () => {
              setOpen(false);
              setTypeCode("");
              setName("");
              setPlannedAt("");
              setIsFixed(false);
            },
          },
        );
      }}
      className="flex flex-col gap-2 rounded-md border border-border p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-ink-secondary">
          {t("type")}
          <select
            required
            value={typeCode}
            onChange={(e) => setTypeCode(e.target.value)}
            className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          >
            <option value="" disabled>
              {t("selectAType")}
            </option>
            {types?.map((type) => (
              <option key={type.code} value={type.code}>
                {type.label_en}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-xs text-ink-secondary">
          {t("name")}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("plannedDate")}
          <input
            type="datetime-local"
            value={plannedAt}
            onChange={(e) => setPlannedAt(e.target.value)}
            className="mt-1 block w-48 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
          />
        </label>
        <label className="flex items-center gap-1.5 pb-1.5 text-xs text-ink-secondary">
          <input
            type="checkbox"
            checked={isFixed}
            onChange={(e) => setIsFixed(e.target.checked)}
          />
          {t("fixed")}
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {createMutation.isPending ? t("adding") : t("add")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary"
        >
          {t("cancel")}
        </button>
        {createMutation.isError && <p className="text-xs text-critical">{t("error")}</p>}
      </div>
    </form>
  );
}
