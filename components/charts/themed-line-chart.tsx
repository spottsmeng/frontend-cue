"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useMemo } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleTime } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { TooltipWithBounds, useTooltip } from "@visx/tooltip";

import { formatDate } from "@/lib/format";

import { CHART_FILL_CLASSES, CHART_STROKE_CLASSES, chartColorIndex } from "./chart-colors";

const MARGIN = { top: 8, right: 16, bottom: 28, left: 44 };
const HEIGHT = 220;

/** A single plotted point — `x` is an ISO date/timestamp, deliberately a
 * generic name (not e.g. `weekStart`) since this primitive is shared across
 * every chart in the app, not just week-bucketed analytics ones. */
export interface ChartPoint {
  x: string;
  value: number;
}

/** One line's worth of data — `id` need not be a project id despite this
 * component's original analytics-only origin; components/vendors/
 * metric-history-chart.tsx uses a single-element array keyed by metric
 * name, for instance. */
export interface ChartSeries {
  id: string;
  label: string;
  points: ChartPoint[];
}

interface HoverDatum {
  x: string;
  seriesLabel: string;
  value: number;
}

/**
 * The one shared visx primitive for every chart in this app (DESIGN.md's
 * "Charting" section) — one `LinePath` per series, themed entirely via
 * Tailwind utility classes on the five `chart-*` tokens, never a raw hex.
 * Single-series callers (e.g. a metric sparkline) get a one-element
 * `series` array and no legend (`ChartLegend` itself renders nothing below
 * two items). Every consumer also renders an exact-numbers table/list
 * alongside this — the chart is a visual aid, the table is the source of
 * truth.
 */
export function ThemedLineChart({
  series,
  valueFormat = (value: number) => value.toLocaleString("en-SG"),
  ariaLabel,
}: {
  series: ChartSeries[];
  valueFormat?: (value: number) => string;
  ariaLabel: string;
}) {
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
    useTooltip<HoverDatum>();

  const allPoints = useMemo(
    () => series.flatMap((s) => s.points.map((p) => ({ ...p, seriesLabel: s.label }))),
    [series],
  );

  if (allPoints.length === 0) {
    return <p className="text-sm text-ink-muted">No data points yet for this chart.</p>;
  }

  return (
    <ParentSize>
      {({ width }) => {
        if (width === 0) return null;
        const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
        const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

        const times = allPoints.map((p) => new Date(p.x).getTime());
        const xScale = scaleTime({
          domain: [new Date(Math.min(...times)), new Date(Math.max(...times))],
          range: [0, innerWidth],
        });
        const maxValue = Math.max(...allPoints.map((p) => p.value));
        const yScale = scaleLinear({
          domain: [0, maxValue === 0 ? 1 : maxValue],
          range: [innerHeight, 0],
          nice: true,
        });

        function handlePointerMove(
          event: ReactPointerEvent<SVGCircleElement>,
          x: string,
          value: number,
          seriesLabel: string,
        ) {
          const coords = localPoint(event) ?? { x: 0, y: 0 };
          showTooltip({
            tooltipData: { x, value, seriesLabel },
            tooltipLeft: coords.x,
            tooltipTop: coords.y,
          });
        }

        return (
          <div className="relative">
            <svg width={width} height={HEIGHT} role="img" aria-label={ariaLabel}>
              <Group left={MARGIN.left} top={MARGIN.top}>
                <GridRows
                  scale={yScale}
                  width={innerWidth}
                  numTicks={4}
                  className="stroke-border"
                  strokeOpacity={0.6}
                />
                {series.map((s, i) => {
                  const colorIndex = chartColorIndex(i);
                  return (
                    <Group key={s.id}>
                      <LinePath
                        data={s.points}
                        x={(p) => xScale(new Date(p.x)) ?? 0}
                        y={(p) => yScale(p.value) ?? 0}
                        className={`fill-none ${CHART_STROKE_CLASSES[colorIndex]}`}
                        strokeWidth={2}
                      />
                      {s.points.map((p) => (
                        <circle
                          key={p.x}
                          cx={xScale(new Date(p.x))}
                          cy={yScale(p.value)}
                          r={4}
                          className={`cursor-pointer ${CHART_FILL_CLASSES[colorIndex]}`}
                          onPointerMove={(event) => handlePointerMove(event, p.x, p.value, s.label)}
                          onPointerLeave={hideTooltip}
                        />
                      ))}
                    </Group>
                  );
                })}
                <AxisLeft
                  scale={yScale}
                  numTicks={4}
                  hideAxisLine
                  tickStroke="var(--color-border)"
                  tickFormat={(v) => valueFormat(Number(v))}
                  tickLabelProps={() => ({
                    className: "fill-ink-muted font-mono",
                    fontSize: 10,
                    textAnchor: "end",
                    dx: "-0.4em",
                    dy: "0.32em",
                  })}
                />
                <AxisBottom
                  top={innerHeight}
                  scale={xScale}
                  numTicks={Math.min(allPoints.length, 6)}
                  stroke="var(--color-border)"
                  tickStroke="var(--color-border)"
                  tickFormat={(v) => formatDate((v as Date).toISOString())}
                  tickLabelProps={() => ({
                    className: "fill-ink-muted font-mono",
                    fontSize: 10,
                    textAnchor: "middle",
                  })}
                />
              </Group>
            </svg>
            {tooltipOpen && tooltipData && (
              <TooltipWithBounds
                left={tooltipLeft}
                top={tooltipTop}
                style={{ position: "absolute" }}
                className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-ink shadow-pop"
              >
                <div className="font-medium">{tooltipData.seriesLabel}</div>
                <div className="text-ink-muted">{formatDate(tooltipData.x)}</div>
                <div className="font-mono">{valueFormat(tooltipData.value)}</div>
              </TooltipWithBounds>
            )}
          </div>
        );
      }}
    </ParentSize>
  );
}
