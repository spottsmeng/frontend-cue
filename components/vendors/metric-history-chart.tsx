"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/format";
import { VendorPermissionError, useVendorReliabilityHistoryQuery } from "@/lib/vendors/hooks";
import type { VendorMetricName } from "@/lib/api/types";

import { ThemedLineChart } from "@/components/charts/themed-line-chart";

import { METRIC_LABEL, METRIC_NAMES, formatMetricValue } from "./metric-meta";

/**
 * FR-VRG-03's "update continuously" made visible as a trend — every
 * VendorMetric snapshot ever written for this vendor/segment/metric,
 * oldest first (append-only, per app/parties/models.py's own docstring,
 * this milestone's own NON-OBVIOUS note). The snapshot list underneath the
 * chart is the honest source of truth (exact value/unavailable-reason per
 * point); the chart above it (`ThemedLineChart`, DESIGN.md's shared visx
 * primitive — retrofitted here post-F8 for one consistent charting
 * technique across the app, see frontend/PROGRESS.md's F8 notes) is a
 * visual aid, not the only place the numbers live. A single-point history
 * renders no chart at all — a one-point line has nothing to compare
 * against — the snapshot list below still shows it.
 */
export function MetricHistoryChart({
  partyId,
  eventArchetype,
}: {
  partyId: string;
  eventArchetype: string | undefined;
}) {
  const [metric, setMetric] = useState<VendorMetricName>("on_time_rate");
  const { data, isLoading, isError, error } = useVendorReliabilityHistoryQuery(
    partyId,
    metric,
    eventArchetype,
  );

  if (isError) {
    if (error instanceof VendorPermissionError) {
      return (
        <p className="text-sm text-ink-muted">
          Vendor reliability history is Finance/Procurement only.
        </p>
      );
    }
    return <p className="text-sm text-critical">Could not load history. Please retry.</p>;
  }

  const history = data?.history ?? [];
  const points = history
    .filter((h) => h.available && h.value !== null)
    .map((h) => ({ x: h.computed_at ?? "", value: h.value as number }));

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-ink-secondary">
        Metric
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as VendorMetricName)}
          className="mt-1 block w-64 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
        >
          {METRIC_NAMES.map((m) => (
            <option key={m} value={m}>
              {METRIC_LABEL[m]}
            </option>
          ))}
        </select>
      </label>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading history…</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-ink-muted">No snapshots recorded yet for this metric/segment.</p>
      ) : (
        <>
          {points.length >= 2 ? (
            <ThemedLineChart
              series={[{ id: metric, label: METRIC_LABEL[metric], points }]}
              valueFormat={(v) => formatMetricValue(metric, v)}
              ariaLabel="Metric trend over time"
            />
          ) : (
            <p className="text-xs text-ink-muted">
              Fewer than two available snapshots — not enough to draw a trend line yet.
            </p>
          )}
          <ul className="flex flex-col gap-1.5">
            {history.map((h, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-1.5 text-xs"
              >
                <span className="font-mono text-ink-muted">{formatDateTime(h.computed_at)}</span>
                {h.available && h.value !== null ? (
                  <span className="font-mono font-medium text-ink">{formatMetricValue(metric, h.value)}</span>
                ) : (
                  <span className="text-ink-muted">not available — {h.unavailable_reason}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
