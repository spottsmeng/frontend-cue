"use client";

import Link from "next/link";

import { CommitmentSummaryRow } from "@/components/living-wip/commitment-summary-row";
import { DecisionLogRow } from "@/components/living-wip/decision-log-row";
import { RiskLogRow } from "@/components/living-wip/risk-log-row";
import { formatDate, formatDateTime } from "@/lib/format";
import { useSuccessorBriefMutation } from "@/lib/ask/hooks";
import { useProjectMembersQuery, resolveMemberLabel } from "@/lib/members/hooks";

const DEVIATION_STATUS_LABEL: Record<string, string> = {
  auto_drafted: "Auto-drafted — needs review",
  confirmed: "Confirmed",
  resolved: "Resolved",
};

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
  const briefMutation = useSuccessorBriefMutation(projectId);
  const { data: members } = useProjectMembersQuery(projectId);
  const brief = briefMutation.data;

  return (
    <div className="flex flex-col gap-4">
      {!brief && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-ink-secondary">
            Generates a full handover pack for an incoming PM — open commitments, decision history,
            risks, key documents, vendor contacts, and every deviation with its resolution (not just
            the ones still open).
          </p>
          <button
            type="button"
            disabled={briefMutation.isPending}
            onClick={() => briefMutation.mutate()}
            className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {briefMutation.isPending ? "Generating…" : "Generate successor brief"}
          </button>
          {briefMutation.isError && (
            <p className="text-sm text-critical">Could not generate the brief — please try again.</p>
          )}
        </div>
      )}

      {brief && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-muted">Generated {formatDateTime(brief.generated_at)}</p>
            <button
              type="button"
              disabled={briefMutation.isPending}
              onClick={() => briefMutation.mutate()}
              className="rounded-md border border-border-strong px-2.5 py-1 text-xs text-ink-secondary hover:border-signal hover:text-signal"
            >
              Regenerate
            </button>
          </div>

          <BriefSection title="Open commitments">
            {brief.open_commitments.length === 0 ? (
              <p className="text-sm text-ink-muted">No open commitments.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {brief.open_commitments.map((c) => (
                  <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                ))}
              </ul>
            )}
          </BriefSection>

          <BriefSection title="Decision history">
            {brief.decision_history.length === 0 ? (
              <p className="text-sm text-ink-muted">No decisions recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {brief.decision_history.map((d) => (
                  <DecisionLogRow key={d.audit_log_id} decision={d} onOpenCommitment={onOpenCommitment} />
                ))}
              </ul>
            )}
          </BriefSection>

          <BriefSection title="Risks">
            {brief.risks.length === 0 ? (
              <p className="text-sm text-ink-muted">No open risks.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {brief.risks.map((r) => (
                  <RiskLogRow key={r.risk_id} risk={r} onOpenCommitment={onOpenCommitment} />
                ))}
              </ul>
            )}
          </BriefSection>

          <BriefSection title="Key documents">
            {brief.key_documents.length === 0 ? (
              <p className="text-sm text-ink-muted">No documents recorded yet.</p>
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
                      {doc.approved ? "Approved" : "Not yet approved"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </BriefSection>

          <BriefSection title="Vendor contacts">
            {brief.vendor_contacts.length === 0 ? (
              <p className="text-sm text-ink-muted">No vendors recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {brief.vendor_contacts.map((v) => (
                  <li
                    key={v.party_id}
                    className="flex items-center justify-between rounded-md border border-border p-2"
                  >
                    <span className="text-sm text-ink">{v.display_name}</span>
                    <span className="font-mono text-xs text-ink-muted">
                      {v.open_commitment_count} open commitment{v.open_commitment_count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </BriefSection>

          <BriefSection title="Deviations and resolutions">
            <p className="mb-2 text-xs text-ink-muted">
              Every deviation on this project, resolved or not — a handover needs the history, not just
              what&rsquo;s still open.
            </p>
            {brief.deviations_and_resolutions.length === 0 ? (
              <p className="text-sm text-ink-muted">No deviations recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {brief.deviations_and_resolutions.map((dev) => (
                  <li key={dev.deviation_id} className="rounded-md border border-border p-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-ink">{dev.description_en}</p>
                      <span className="shrink-0 rounded-full bg-surface-sunk px-2 py-0.5 text-xs font-medium text-ink-secondary">
                        {DEVIATION_STATUS_LABEL[dev.status] ?? dev.status}
                      </span>
                    </div>
                    {dev.resolution_date && dev.resolution_owner && (
                      <p className="mt-1 text-xs text-ink-secondary">
                        Resolved for {formatDate(dev.resolution_date)}, owner{" "}
                        {resolveMemberLabel(members, dev.resolution_owner)}
                      </p>
                    )}
                    <Link
                      href={`/projects/${projectId}/foresight`}
                      className="mt-1 inline-block text-xs text-signal hover:underline"
                    >
                      View in Foresight →
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
