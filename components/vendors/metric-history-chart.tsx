"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/format";
import { VendorPermissionError, useVendorReliabilityHistoryQuery } from "@/lib/vendors/hooks";
import type { VendorMetricName } from "@/lib/api/types";

import { METRIC_LABEL, METRIC_NAMES, formatMetricValue } from "./metric-meta";

const CHART_WIDTH = 480;
const CHART_HEIGHT = 96;
const CHART_PADDING = 8;

/**
 * A minimal, dependency-free SVG polyline — CUE-Tech-Stack.md §4's own
 * "tens of nodes... twenty lines of code, not a library" reasoning (already
 * applied to Twin's timeline over a graph-visualisation library) extends
 * naturally to a five-point trend line; pulling in a charting dependency
 * for this would be the same kind of premature weight that reasoning
 * already ruled out elsewhere in this codebase. Plotted only over points
 * with a real `value` (`available: true`) — an unavailable snapshot has no
 * y-coordinate to honestly place, never interpolated or shown as zero.
 */
function Sparkline({ points }: { points: { x: number; y: number }[] }) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;

  const coords = points.map((p, i) => {
    const x = CHART_PADDING + (i / (points.length - 1)) * usableWidth;
    const y = CHART_PADDING + usableHeight - ((p.y - min) / span) * usableHeight;
    return { x, y };
  });

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" role="img" aria-label="Metric trend over time">
      <polyline
        points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
        className="fill-none stroke-signal"
        strokeWidth={2}
      />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} className="fill-signal" />
      ))}
    </svg>
  );
}

/**
 * FR-VRG-03's "update continuously" made visible as a trend — every
 * VendorMetric snapshot ever written for this vendor/segment/metric,
 * oldest first (append-only, per app/parties/models.py's own docstring,
 * this milestone's own NON-OBVIOUS note). The snapshot list underneath the
 * chart is the honest source of truth (exact value/unavailable-reason per
 * point); the sparkline above it is a visual aid, not the only place the
 * numbers live.
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
    .map((h) => ({ x: new Date(h.computed_at ?? 0).getTime(), y: h.value as number }));

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
          <Sparkline points={points} />
          {points.length < 2 && (
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
