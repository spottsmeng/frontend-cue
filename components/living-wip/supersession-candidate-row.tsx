"use client";

import { useTranslations } from "next-intl";

import { formatMoney } from "@/lib/format";
import {
  useCommitmentQuery,
  useConfirmSupersessionCandidateMutation,
  useRejectSupersessionCandidateMutation,
} from "@/lib/commitments/hooks";
import type { CommitmentOut, CommitmentSupersessionCandidateOut, MembershipRole } from "@/lib/api/types";
import { WRITE_ROLES, hasAnyRole } from "@/lib/roles";

/**
 * FR-LED-05: one AI-proposed candidate — "commitment X appears to revise
 * commitment Y" — with the model's own stated reasoning, and the two real
 * actions a human actually has (confirm it for real, or reject it). Both
 * commitments are resolved via useCommitmentQuery (the same hook the
 * commitment detail drawer already uses) rather than this row inventing a
 * second commitment-display shape — the API itself only ever returns plain
 * ids here (CommitmentSupersessionCandidateOut's own docstring: "resolve
 * against an already-fetched list client-side, same discipline this API
 * holds everywhere else").
 */
export function SupersessionCandidateRow({
  projectId,
  candidate,
  effectiveRoles,
}: {
  projectId: string;
  candidate: CommitmentSupersessionCandidateOut;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("livingWip.supersessionCandidate");
  const { data: newer } = useCommitmentQuery(projectId, candidate.commitment_id);
  const { data: older } = useCommitmentQuery(projectId, candidate.supersedes_commitment_id);
  const confirmMutation = useConfirmSupersessionCandidateMutation(projectId);
  const rejectMutation = useRejectSupersessionCandidateMutation(projectId);
  const canWrite = hasAnyRole(effectiveRoles, WRITE_ROLES);

  function amountLabel(commitment: CommitmentOut | undefined): string {
    if (!commitment) return t("loadingAmount");
    return commitment.amount === null
      ? t("notSpecified")
      : formatMoney(commitment.amount, commitment.currency);
  }

  return (
    <li className="rounded-md border border-border p-3">
      <p lang="en" className="text-sm text-ink">
        {newer?.deliverable_en ?? t("loadingName")}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-ink-muted">
          {t("was", { amount: amountLabel(older) })}
        </span>
        <span aria-hidden className="text-ink-muted">
          →
        </span>
        <span className="rounded-full bg-dusk-soft px-2 py-0.5 text-dusk">
          {t("now", { amount: amountLabel(newer) })}
        </span>
      </div>

      <p className="mt-2 text-xs text-ink-secondary">{candidate.reasoning}</p>

      {candidate.status !== "pending" && (
        <p className="mt-2 text-xs font-medium text-ink-muted">
          {candidate.status === "confirmed" ? t("confirmed") : t("rejected")}
        </p>
      )}

      {canWrite && candidate.status === "pending" && (
        <div className="mt-2 flex gap-2 border-t border-border pt-2">
          <button
            type="button"
            disabled={confirmMutation.isPending}
            onClick={() => confirmMutation.mutate(candidate.id)}
            className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {t("confirmAction")}
          </button>
          <button
            type="button"
            disabled={rejectMutation.isPending}
            onClick={() => rejectMutation.mutate(candidate.id)}
            className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary hover:border-critical hover:text-critical disabled:opacity-50"
          >
            {t("rejectAction")}
          </button>
        </div>
      )}
      {(confirmMutation.isError || rejectMutation.isError) && (
        <p className="mt-2 text-xs text-critical">{t("saveError")}</p>
      )}
    </li>
  );
}
