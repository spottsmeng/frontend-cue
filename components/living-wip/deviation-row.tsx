"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { DeviationLogRow, MembershipRole } from "@/lib/api/types";
import { useConfirmDeviationMutation } from "@/lib/deviations/hooks";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";

import { ProvenanceChip } from "./provenance-chip";

/**
 * FR-DEV-04/05: an auto-drafted deviation surfaced in the risk-and-issues
 * section gets the same two-step verify-style pattern FR-LED-08 established
 * — "confirm as-is" or edit the description, in one call
 * (DeviationConfirmRequest's own docstring: "an empty body confirms... /
 * description_en set corrects it, mirroring VerifyRequest's shape").
 */
export function DeviationRow({
  projectId,
  deviation,
  effectiveRoles,
  onOpenCommitment,
}: {
  projectId: string;
  deviation: DeviationLogRow;
  effectiveRoles: MembershipRole[] | undefined;
  onOpenCommitment?: (commitmentId: string) => void;
}) {
  const t = useTranslations("livingWip.deviationRow");
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(deviation.description_en);
  const confirmMutation = useConfirmDeviationMutation(projectId);
  const canConfirm = hasAnyRole(effectiveRoles, WRITE_ROLES);
  const needsReview = deviation.status === "auto_drafted";

  const STATUS_LABEL: Record<string, string> = {
    auto_drafted: t("statusAutoDrafted"),
    confirmed: t("statusConfirmed"),
    resolved: t("statusResolved"),
  };

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p lang="en" className="text-sm text-ink">
            {deviation.description_en}
          </p>
          <p className="mt-1 font-mono text-xs text-ink-muted">
            {deviation.class_code ?? t("uncategorised")} · {STATUS_LABEL[deviation.status] ?? deviation.status}
          </p>
        </div>
        <ProvenanceChip provenance={[deviation.provenance]} onOpenCommitment={onOpenCommitment} />
      </div>

      {needsReview && canConfirm && (
        <div className="mt-2">
          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-border bg-surface p-2 text-sm text-ink"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={confirmMutation.isPending}
                  onClick={() =>
                    confirmMutation.mutate({
                      deviationId: deviation.deviation_id,
                      descriptionEn:
                        description !== deviation.description_en ? description : undefined,
                    })
                  }
                  className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {t("confirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate({ deviationId: deviation.deviation_id })}
                className="rounded-md border border-signal px-3 py-1.5 text-xs font-medium text-signal hover:bg-signal-soft disabled:opacity-50"
              >
                {t("confirmAsIs")}
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary hover:border-signal hover:text-signal"
              >
                {t("editAndConfirm")}
              </button>
            </div>
          )}
          {confirmMutation.isError && (
            <p className="mt-2 text-xs text-critical">{t("confirmError")}</p>
          )}
        </div>
      )}
    </li>
  );
}
