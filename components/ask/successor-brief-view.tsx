"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { CommitmentSummaryRow } from "@/components/living-wip/commitment-summary-row";
import { DecisionLogRow } from "@/components/living-wip/decision-log-row";
import { RiskLogRow } from "@/components/living-wip/risk-log-row";
import { formatDate, formatDateTime } from "@/lib/format";
import { useSuccessorBriefMutation } from "@/lib/ask/hooks";
import { useProjectMembersQuery, resolveMemberLabel } from "@/lib/members/hooks";

/**
 * FR-ASK-07, §12.5: "one control; produces a structured handover pack" —
 * a single button, not a wizard collecting input first (the backend
 * composes the whole thing from existing project state — `POST
 * .../ask/successor-brief` takes no request body at all, confirmed against
 * app/api/ask.py directly). Designed for CUE-PRD.md §2's incoming PM David
 * — someone who has never opened this project before — not the outgoing PM
 * who already knows everything on it, per this milestone's own READ FIRST
 * note.
 */
export function SuccessorBriefView({
  projectId,
  onOpenCommitment,
}: {
  projectId: string;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const t = useTranslations("ask.successorBrief");
  const briefMutation = useSuccessorBriefMutation(projectId);
  const { data: members } = useProjectMembersQuery(projectId);
  const brief = briefMutation.data;

  return (
    <div className="flex flex-col gap-4">
      {!brief && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-ink-secondary">{t("description")}</p>
          <button
            type="button"
            disabled={briefMutation.isPending}
            onClick={() => briefMutation.mutate()}
            className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {briefMutation.isPending ? t("generating") : t("generate")}
          </button>
          {briefMutation.isError && (
            <p className="text-sm text-critical">{t("generateError")}</p>
          )}
        </div>
      )}

      {brief && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-muted">{t("generatedAt", { date: formatDateTime(brief.generated_at) })}</p>
            <button
              type="button"
              disabled={briefMutation.isPending}
              onClick={() => briefMutation.mutate()}
              className="rounded-md border border-border-strong px-2.5 py-1 text-xs text-ink-secondary hover:border-signal hover:text-signal"
            >
              {t("regenerate")}
            </button>
          </div>

          <BriefSection title={t("sections.openCommitments")}>
            {brief.open_commitments.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("empty.openCommitments")}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {brief.open_commitments.map((c) => (
                  <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                ))}
              </ul>
            )}
          </BriefSection>

          <BriefSection title={t("sections.decisionHistory")}>
            {brief.decision_history.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("empty.decisionHistory")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {brief.decision_history.map((d) => (
                  <DecisionLogRow key={d.audit_log_id} decision={d} onOpenCommitment={onOpenCommitment} />
                ))}
              </ul>
            )}
          </BriefSection>

          <BriefSection title={t("sections.risks")}>
            {brief.risks.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("empty.risks")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {brief.risks.map((r) => (
                  <RiskLogRow key={r.risk_id} risk={r} onOpenCommitment={onOpenCommitment} />
                ))}
              </ul>
            )}
          </BriefSection>

          <BriefSection title={t("sections.keyDocuments")}>
            {brief.key_documents.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("empty.keyDocuments")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {brief.key_documents.map((doc) => (
                  <li
                    key={doc.document_id}
                    className="flex items-center justify-between rounded-md border border-border p-2"
                  >
                    <Link
                      href={`/projects/${projectId}/documents/${doc.document_id}`}
                      className="text-sm text-signal hover:underline"
                    >
                      {doc.name}
                    </Link>
                    <span className="font-mono text-xs text-ink-muted">
                      {doc.approved ? t("documentApproved") : t("documentNotApproved")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </BriefSection>

          <BriefSection title={t("sections.vendorContacts")}>
            {brief.vendor_contacts.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("empty.vendorContacts")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {brief.vendor_contacts.map((v) => (
                  <li
                    key={v.party_id}
                    className="flex items-center justify-between rounded-md border border-border p-2"
                  >
                    <span className="text-sm text-ink">{v.display_name}</span>
                    <span className="font-mono text-xs text-ink-muted">
                      {t("openCommitmentCount", { count: v.open_commitment_count })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </BriefSection>

          <BriefSection title={t("sections.deviationsAndResolutions")}>
            <p className="mb-2 text-xs text-ink-muted">{t("deviationsHint")}</p>
            {brief.deviations_and_resolutions.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("empty.deviationsAndResolutions")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {brief.deviations_and_resolutions.map((dev) => (
                  <li key={dev.deviation_id} className="rounded-md border border-border p-2">
                    <div className="flex items-start justify-between gap-2">
                      <p lang="en" className="text-sm text-ink">
                        {dev.description_en}
                      </p>
                      <span className="shrink-0 rounded-full bg-surface-sunk px-2 py-0.5 text-xs font-medium text-ink-secondary">
                        {t.has(`deviationStatus.${dev.status}`) ? t(`deviationStatus.${dev.status}`) : dev.status}
                      </span>
                    </div>
                    {dev.resolution_date && dev.resolution_owner && (
                      <p className="mt-1 text-xs text-ink-secondary">
                        {t("resolvedFor", {
                          date: formatDate(dev.resolution_date),
                          owner: resolveMemberLabel(members, dev.resolution_owner),
                        })}
                      </p>
                    )}
                    <Link
                      href={`/projects/${projectId}/foresight`}
                      className="mt-1 inline-block text-xs text-signal hover:underline"
                    >
                      {t("viewInForesight")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </BriefSection>
        </div>
      )}
    </div>
  );
}

function BriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}
