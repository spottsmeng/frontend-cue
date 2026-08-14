"use client";

import { useTranslations } from "next-intl";

import { computeWritebackReplyRate } from "@/lib/analytics/aggregate";
import { useAnalyticsWritebackQuery } from "@/lib/analytics/hooks";
import { formatDate } from "@/lib/format";

import { ChartLegend } from "@/components/charts/chart-legend";
import { ThemedLineChart, type ChartSeries } from "@/components/charts/themed-line-chart";

/**
 * PRD §13's "write-back reply rate" — vendor confirmations received vs.
 * sent, per project per week. `OutboundMessageOut.status`/`reply_outcome`
 * from `GET .../writeback` gives both sides directly; no server-side
 * bucketing exists, so this fans the raw rows out across every visible
 * project (`useAnalyticsWritebackQuery`) and aggregates client-side
 * (`computeWritebackReplyRate`, unit-tested).
 */
export function WritebackReplyRateChart({
  projectIds,
  projectsById,
}: {
  projectIds: string[];
  projectsById: Map<string, string>;
}) {
  const t = useTranslations("analytics.writebackReplyRateChart");
  const { data, isLoading, isError } = useAnalyticsWritebackQuery(projectIds);

  if (isError) {
    return <p className="text-sm text-critical">{t("loadError")}</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  }

  const { series, rows } = computeWritebackReplyRate(data ?? [], projectsById);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        {t("empty")}
      </p>
    );
  }

  const chartSeries: ChartSeries[] = series.map((s) => ({
    id: s.projectId,
    label: s.projectName,
    points: s.points.map((p) => ({ x: p.weekStart, value: p.value })),
  }));

  return (
    <div className="flex flex-col gap-3">
      <ThemedLineChart
        series={chartSeries}
        valueFormat={(v) => `${v.toFixed(0)}%`}
        ariaLabel={t("chartAriaLabel")}
      />
      <ChartLegend items={chartSeries.map((s) => ({ id: s.id, label: s.label }))} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-ink-muted">
              <th className="py-1 pr-4 font-medium">{t("headers.weekOf")}</th>
              <th className="py-1 pr-4 font-medium">{t("headers.project")}</th>
              <th className="py-1 pr-4 font-medium">{t("headers.sent")}</th>
              <th className="py-1 pr-4 font-medium">{t("headers.replied")}</th>
              <th className="py-1 font-medium">{t("headers.rate")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.weekStart}-${row.projectId}`} className="border-t border-border">
                <td className="py-1 pr-4 font-mono text-ink-secondary">{formatDate(row.weekStart)}</td>
                <td className="py-1 pr-4 text-ink">{row.projectName}</td>
                <td className="py-1 pr-4 font-mono text-ink">{row.sent}</td>
                <td className="py-1 pr-4 font-mono text-ink">{row.replied}</td>
                <td className="py-1 font-mono text-ink">{row.rate.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
