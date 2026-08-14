"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { formatDate, formatDateTime } from "@/lib/format";
import { useConfirmDeviationMutation, useResolveDeviationMutation } from "@/lib/deviations/hooks";
import { resolveTermLabel } from "@/lib/foresight/hooks";
import { resolveMemberLabel } from "@/lib/members/hooks";
import type { DeviationOut, MembershipRole, OntologyTermOut, ProjectMemberOut } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";

import { EvidenceViewer } from "../living-wip/evidence-viewer";

/**
 * FR-DEV: this milestone's own list item for the real `DeviationOut`
 * resource (list/detail/confirm/resolve) — a different shape from F1's own
 * `DeviationRow` (components/living-wip/deviation-row.tsx), which renders
 * the report's already-flattened `DeviationLogRow` rollup. Reuses F1's
 * confirm mutation (lib/deviations/hooks.ts's useConfirmDeviationMutation)
 * and its two-step "confirm as-is" / "edit & confirm" pattern rather than
 * inventing a second one, per this milestone's own instruction.
 *
 * `classTerms`/`members` are fetched once by `DeviationList` and passed
 * down (same "fetch once, pass as props" convention `effectiveRoles`
 * already follows across this app) rather than each row independently
 * calling the same query.
 */
export function DeviationRow({
  projectId,
  deviation,
  effectiveRoles,
  classTerms,
  members,
}: {
  projectId: string;
  deviation: DeviationOut;
  effectiveRoles: MembershipRole[] | undefined;
  classTerms: OntologyTermOut[] | undefined;
  members: ProjectMemberOut[] | undefined;
}) {
  const t = useTranslations("foresight.deviationRow");
  const STATUS_LABEL_KEY: Record<string, "autoDrafted" | "confirmed" | "resolved"> = {
    auto_drafted: "autoDrafted",
    confirmed: "confirmed",
    resolved: "resolved",
  };
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(deviation.description_en);
  const [resolving, setResolving] = useState(false);
  const [resolutionDate, setResolutionDate] = useState("");
  const [resolutionOwner, setResolutionOwner] = useState("");

  const confirmMutation = useConfirmDeviationMutation(projectId);
  const resolveMutation = useResolveDeviationMutation(projectId);
  const canWrite = hasAnyRole(effectiveRoles, WRITE_ROLES);
  const needsReview = deviation.status === "auto_drafted";
  const canResolve = deviation.status !== "resolved";

  const classTerm = resolveTermLabel(classTerms, deviation.class_term_id);

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <p lang="en" className="text-sm text-ink">
          {deviation.description_en}
        </p>
        <span className="shrink-0 rounded-full bg-surface-sunk px-2 py-0.5 text-xs font-medium text-ink-secondary">
          {STATUS_LABEL_KEY[deviation.status] ? t(`status.${STATUS_LABEL_KEY[deviation.status]}`) : deviation.status}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        {classTerm ? (
          <>
            {classTerm.label_en} <span className="font-mono">({classTerm.code})</span>
          </>
        ) : (
          <span className="font-mono">{t("classFallback", { id: deviation.class_term_id })}</span>
        )}{" "}
        · <span className="font-mono">{formatDateTime(deviation.created_at)}</span>
      </p>

      <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
        {deviation.commitment_id && (
          <Link href={`/projects/${projectId}`} className="text-signal hover:underline">
            {t("viewInLivingWip")}
          </Link>
        )}
        {deviation.milestone_id && (
          <Link href={`/projects/${projectId}/twin`} className="text-signal hover:underline">
            {t("viewInTwin")}
          </Link>
        )}
      </div>

      {deviation.resolution_date && deviation.resolution_owner && (
        <p className="mt-1.5 text-xs text-ink-secondary">
          {t("resolvedFor", {
            date: formatDate(deviation.resolution_date),
            owner: resolveMemberLabel(members, deviation.resolution_owner),
          })}
        </p>
      )}

      <div className="mt-2">
        <EvidenceViewer evidence={deviation.evidence} />
      </div>

      {canWrite && needsReview && (
        <div className="mt-2 border-t border-border pt-2">
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
                      deviationId: deviation.id,
                      descriptionEn: description !== deviation.description_en ? description : undefined,
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
                onClick={() => confirmMutation.mutate({ deviationId: deviation.id })}
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

      {canWrite && canResolve && (
        <div className="mt-2 border-t border-border pt-2">
          {resolving ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!resolutionDate || !resolutionOwner) return;
                resolveMutation.mutate(
                  {
                    deviationId: deviation.id,
                    resolutionDate: new Date(resolutionDate).toISOString(),
                    resolutionOwner,
                  },
                  { onSuccess: () => setResolving(false) },
                );
              }}
              className="flex flex-wrap items-end gap-2"
            >
              <label className="text-xs text-ink-secondary">
                {t("resolutionDate")}
                <input
                  required
                  type="date"
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                  className="mt-1 block rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
                />
              </label>
              <label className="text-xs text-ink-secondary">
                {t("owner")}
                <select
                  required
                  value={resolutionOwner}
                  onChange={(e) => setResolutionOwner(e.target.value)}
                  disabled={!members || members.length === 0}
                  className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink disabled:opacity-60"
                >
                  <option value="" disabled>
                    {members ? t("selectAProjectMember") : t("loadingMembers")}
                  </option>
                  {members?.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {t("memberOption", { name: m.display_name ?? m.email, role: m.role })}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={resolveMutation.isPending}
                className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {t("saveResolution")}
              </button>
              <button
                type="button"
                onClick={() => setResolving(false)}
                className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary"
              >
                {t("cancel")}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setResolving(true)}
              className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary hover:border-signal hover:text-signal"
            >
              {t("recordResolution")}
            </button>
          )}
          {resolveMutation.isError && (
            <p className="mt-2 text-xs text-critical">{t("resolveError")}</p>
          )}
        </div>
      )}
    </li>
  );
}
