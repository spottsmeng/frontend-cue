"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CommitmentSummaryRow } from "@/components/living-wip/commitment-summary-row";
import { DecisionLogRow } from "@/components/living-wip/decision-log-row";
import { formatDate } from "@/lib/format";
import { useAskSummaryQuery } from "@/lib/ask/hooks";

/**
 * The only summary variant that needs caller-supplied input (`period_start`/
 * `period_end` — the backend 422s without both, per app/api/ask.py), so it
 * owns its own small date-range form rather than auto-loading on tab
 * selection the way the other four variants do.
 */
export function PeriodDigestSummaryView({
  projectId,
  onOpenCommitment,
}: {
  projectId: string;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const t = useTranslations("ask.summaries.periodDigest");
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [start, setStart] = useState(thirtyDaysAgo.toISOString().slice(0, 10));
  const [end, setEnd] = useState(today.toISOString().slice(0, 10));
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);

  const { data: summaryOut, isLoading, isError } = useAskSummaryQuery(
    projectId,
    "period_digest",
    period
      ? { start: new Date(period.start).toISOString(), end: new Date(period.end).toISOString() }
      : undefined,
  );
  const summary = summaryOut?.period_digest;

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPeriod({ start, end });
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="text-xs text-ink-secondary">
          {t("from")}
          <input
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 block rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("to")}
          <input
            type="date"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 block rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          {t("generate")}
        </button>
      </form>

      {isLoading && <p className="text-sm text-ink-muted">{t("loading")}</p>}
      {isError && <p className="text-sm text-critical">{t("loadError")}</p>}

      {summary && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-muted">
            {t("range", { start: formatDate(summary.period_start), end: formatDate(summary.period_end) })}
          </p>

          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">{t("commitmentsCreated")}</p>
            {summary.commitments_created.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("emptyPeriod")}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {summary.commitments_created.map((c) => (
                  <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">{t("commitmentsResolved")}</p>
            {summary.commitments_resolved.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("emptyPeriod")}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {summary.commitments_resolved.map((c) => (
                  <CommitmentSummaryRow key={c.commitment_id} summary={c} onOpen={onOpenCommitment} />
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">{t("decisions")}</p>
            {summary.decisions.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("emptyPeriod")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {summary.decisions.map((d) => (
                  <DecisionLogRow key={d.audit_log_id} decision={d} onOpenCommitment={onOpenCommitment} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
