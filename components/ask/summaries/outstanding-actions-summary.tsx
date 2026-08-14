import { useTranslations } from "next-intl";

import { CommitmentSummaryRow } from "@/components/living-wip/commitment-summary-row";
import type { OutstandingActionsSummary as OutstandingActionsSummaryT } from "@/lib/api/types";

/**
 * FR-ASK-05's "by owner and by due window" taken literally by the backend —
 * `OutstandingActionsSummary` carries both groupings of the same open-
 * commitment set at once; both render here, not a picker between them.
 */
export function OutstandingActionsSummaryView({
  summary,
  onOpenCommitment,
}: {
  summary: OutstandingActionsSummaryT;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const t = useTranslations("ask.summaries.outstandingActions");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">{t("byOwner")}</p>
        {summary.by_owner.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("empty")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {summary.by_owner.map((group) => (
              <div key={group.party_id}>
                <p className="mb-1 text-sm font-medium text-ink">{group.party_name}</p>
                <ul className="flex flex-col gap-1">
                  {group.commitments.map((c) => (
                    <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">{t("byDueWindow")}</p>
        <div className="flex flex-col gap-3">
          {summary.by_due_window
            .filter((group) => group.commitments.length > 0)
            .map((group) => (
              <div key={group.window}>
                <p className="mb-1 text-sm font-medium text-ink">
                  {t.has(`window.${group.window}`) ? t(`window.${group.window}`) : group.window}
                </p>
                <ul className="flex flex-col gap-1">
                  {group.commitments.map((c) => (
                    <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
