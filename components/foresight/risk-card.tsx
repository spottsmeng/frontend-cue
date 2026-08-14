"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { formatDateTime } from "@/lib/format";
import { ForesightConflictError, useAcknowledgeRiskMutation, useResolveRiskMutation } from "@/lib/foresight/hooks";
import { useResolveSpecClaimQuery } from "@/lib/documents/hooks";
import type { MembershipRole, RiskOut } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";

import { SeverityBadge } from "./severity-badge";
import { RiskStatusBadge } from "./risk-status-badge";

/**
 * CUE-PRD.md §1.3's P3: "An event is only surfaced with its computed
 * downstream consequence. Bare alerts are a bug." — `downstream_consequence`
 * leads every card, ahead of source/severity/status, which sit in a
 * secondary line below it.
 */
export function RiskCard({
  projectId,
  risk,
  effectiveRoles,
}: {
  projectId: string;
  risk: RiskOut;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("foresight.riskCard");
  const [showDetail, setShowDetail] = useState(false);
  const canWrite = hasAnyRole(effectiveRoles, WRITE_ROLES);
  const acknowledgeMutation = useAcknowledgeRiskMutation(projectId);
  const resolveMutation = useResolveRiskMutation(projectId);

  const canAcknowledge = risk.status === "open";
  const canResolve = risk.status === "open" || risk.status === "acknowledged";
  const conflictMessage = (error: unknown) =>
    error instanceof ForesightConflictError
      ? t("conflictSuffix", { message: error.message })
      : t("updateError");

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink">{risk.downstream_consequence}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <SeverityBadge severity={risk.severity} />
          <RiskStatusBadge status={risk.status} />
        </div>
      </div>

      <p className="mt-1.5 font-mono text-xs text-ink-muted">
        {risk.source} ·{" "}
        {risk.base_rate !== null
          ? t("baseRate", { percent: (risk.base_rate * 100).toFixed(0) })
          : t("notEnoughHistory")}
      </p>

      <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
        {risk.commitment_id && (
          <Link href={`/projects/${projectId}`} className="text-signal hover:underline">
            {t("viewInLivingWip")}
          </Link>
        )}
        {risk.milestone_id && (
          <Link href={`/projects/${projectId}/twin`} className="text-signal hover:underline">
            {t("viewInTwin")}
          </Link>
        )}
        {risk.spec_claim_id && <SpecClaimLink projectId={projectId} specClaimId={risk.spec_claim_id} />}
      </div>

      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        aria-expanded={showDetail}
        className="mt-2 text-xs text-ink-muted hover:text-signal"
      >
        {showDetail ? t("hideDetails") : t("details")}
      </button>

      {showDetail && (
        <div className="mt-2 flex flex-col gap-1 rounded-md bg-surface-sunk p-2 font-mono text-xs text-ink-secondary">
          <span>{t("findingKey", { key: risk.finding_key })}</span>
          <span>{t("created", { date: formatDateTime(risk.created_at) })}</span>
          {risk.acknowledged_at && (
            <span>{t("acknowledged", { date: formatDateTime(risk.acknowledged_at) })}</span>
          )}
          {/* Escalation is a periodic sweep that happened to this Risk over
              time, not an action a user triggers here — rendered as a
              timeline entry, never a control (this milestone's own
              NON-OBVIOUS note). */}
          {risk.escalated_to_role && (
            <span>
              {risk.escalated_at
                ? t("escalatedToOnDate", {
                    role: risk.escalated_to_role,
                    date: formatDateTime(risk.escalated_at),
                  })
                : t("escalatedTo", { role: risk.escalated_to_role })}
            </span>
          )}
          {risk.resolved_at && <span>{t("resolved", { date: formatDateTime(risk.resolved_at) })}</span>}
          {risk.superseded_by && <span>{t("superseded")}</span>}
          {Object.keys(risk.detail).length > 0 && (
            <span>{t("detail", { json: JSON.stringify(risk.detail) })}</span>
          )}
        </div>
      )}

      {canWrite && (canAcknowledge || canResolve) && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
          <div className="flex flex-wrap gap-2">
            {canAcknowledge && (
              <button
                type="button"
                disabled={acknowledgeMutation.isPending}
                onClick={() => acknowledgeMutation.mutate(risk.id)}
                className="rounded-md border border-signal px-3 py-1.5 text-xs font-medium text-signal hover:bg-signal-soft disabled:opacity-50"
              >
                {t("acknowledgeAction")}
              </button>
            )}
            {canResolve && (
              <button
                type="button"
                disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate(risk.id)}
                className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {t("resolveAction")}
              </button>
            )}
          </div>
          <p className="text-[11px] text-ink-muted">
            {t("acknowledgeNote")}
          </p>
        </div>
      )}

      {/* Deliberately outside the canAcknowledge/canResolve-gated block
          above: a 409 here means the status just moved to a terminal one
          (resolved/superseded), which is exactly when those booleans flip
          false and the actions block above stops rendering — the
          conflict explanation must survive that, not disappear with it. */}
      {acknowledgeMutation.isError && (
        <p className="mt-2 text-xs text-critical">{conflictMessage(acknowledgeMutation.error)}</p>
      )}
      {resolveMutation.isError && (
        <p className="mt-2 text-xs text-critical">{conflictMessage(resolveMutation.error)}</p>
      )}
    </li>
  );
}

/**
 * Was a static "coming soon" span before F4 shipped a real Documents
 * surface — `GET .../documents/spec-claims/{id}` (F4's own frontend-
 * enablement addition) resolves the claim's own document identity so this
 * can link out for real. Plain navigation to the document, not a deep link
 * to the specific claim/version — same "cross-surface linking is plain
 * navigation" convention this card already uses for commitment_id/
 * milestone_id above.
 */
function SpecClaimLink({ projectId, specClaimId }: { projectId: string; specClaimId: string }) {
  const t = useTranslations("foresight.riskCard");
  const { data: claim } = useResolveSpecClaimQuery(projectId, specClaimId);
  if (!claim) return null;
  return (
    <Link href={`/projects/${projectId}/documents/${claim.document_id}`} className="text-signal hover:underline">
      {t("viewSpecClaim")}
    </Link>
  );
}
