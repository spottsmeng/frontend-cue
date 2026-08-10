import type { MembershipRole, RiskAndIssuesSection as RiskAndIssuesSectionT } from "@/lib/api/types";

import { DeviationRow } from "../deviation-row";
import { EmptyState } from "../empty-state";
import { RiskLogRow } from "../risk-log-row";
import { SectionPanel } from "../section-panel";

/**
 * FR-DEV-05: risks and deviations roll into one section. This session
 * builds the read-only risk row plus the one deviation-confirm action the
 * rollup already implies — the full risks/deviations/escalation surface
 * (severity treatment, resolve, escalate) is F3's job (Foresight), per this
 * milestone's own EXPLICITLY OUT OF SCOPE note; severity/status render as
 * plain labels here rather than a colour system this session would have to
 * invent ahead of F3 actually defining one.
 */
export function RiskAndIssuesPanel({
  section,
  projectId,
  effectiveRoles,
  onOpenCommitment,
}: {
  section: RiskAndIssuesSectionT;
  projectId: string;
  effectiveRoles: MembershipRole[] | undefined;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const empty = section.risks.length === 0 && section.deviations.length === 0;

  return (
    <SectionPanel title="Risk and issues">
      {empty ? (
        <EmptyState message="No open risks or deviations on this project right now." />
      ) : (
        <div className="flex flex-col gap-4">
          {section.risks.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">Risks</p>
              <ul className="flex flex-col gap-1.5">
                {section.risks.map((r) => (
                  <RiskLogRow key={r.risk_id} risk={r} onOpenCommitment={onOpenCommitment} />
                ))}
              </ul>
            </div>
          )}

          {section.deviations.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">Deviations</p>
              <ul className="flex flex-col gap-1.5">
                {section.deviations.map((d) => (
                  <DeviationRow
                    key={d.deviation_id}
                    projectId={projectId}
                    deviation={d}
                    effectiveRoles={effectiveRoles}
                    onOpenCommitment={onOpenCommitment}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </SectionPanel>
  );
}
