"use client";

import { bucketVerificationBurdenByWeek } from "@/lib/analytics/aggregate";
import { useAnalyticsCommitmentsQuery } from "@/lib/analytics/hooks";
import { formatDate } from "@/lib/format";

import { ChartLegend } from "@/components/charts/chart-legend";
import { ThemedLineChart, type ChartSeries } from "@/components/charts/themed-line-chart";

/**
 * PRD §13's "verification burden" — fields requiring human verification per
 * project per week. No endpoint buckets this server-side (F8's own
 * NON-OBVIOUS section) — `useAnalyticsCommitmentsQuery` fans the raw rows
 * out across every project the caller can see, `bucketVerificationBurdenByWeek`
 * (unit-tested, lib/analytics/aggregate.test.ts) does the real arithmetic
 * client-side, at this project's realistic commitment volume.
 */
export function VerificationBurdenChart({
  projectIds,
  projectsById,
}: {
  projectIds: string[];
  projectsById: Map<string, string>;
}) {
  const { data, isLoading, isError } = useAnalyticsCommitmentsQuery(projectIds);

  if (isError) {
    return <p className="text-sm text-critical">Could not load commitments. Please retry.</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-ink-muted">Loading verification burden…</p>;
  }

  const { series, rows } = bucketVerificationBurdenByWeek(data ?? [], projectsById);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No commitments have ever required human verification yet on any project you can see.
      </p>
    );
  }

  // ThemedLineChart (components/charts/) is generic — this surface's own
  // ProjectSeries shape (lib/analytics/aggregate.ts's tested public API,
  // unchanged) maps to the shared { id, label, points: [{x, value}] } shape
  // at this boundary rather than the aggregation module importing anything
  // chart-specific.
  const chartSeries: ChartSeries[] = series.map((s) => ({
    id: s.projectId,
    label: s.projectName,
    points: s.points.map((p) => ({ x: p.weekStart, value: p.value })),
  }));

  return (
    <div className="flex flex-col gap-3">
      <ThemedLineChart
        series={chartSeries}
        ariaLabel="Verification burden: commitments requiring human verification, per project per week"
      />
      <ChartLegend items={chartSeries.map((s) => ({ id: s.id, label: s.label }))} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-ink-muted">
              <th className="py-1 pr-4 font-medium">Week of</th>
              <th className="py-1 pr-4 font-medium">Project</th>
              <th className="py-1 font-medium">Commitments needing verification</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.weekStart}-${row.projectId}`} className="border-t border-border">
                <td className="py-1 pr-4 font-mono text-ink-secondary">{formatDate(row.weekStart)}</td>
                <td className="py-1 pr-4 text-ink">{row.projectName}</td>
                <td className="py-1 font-mono text-ink">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
