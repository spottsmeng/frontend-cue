// DESIGN.md's "Charting" section — five fixed slots, assigned in this
// order, never cycled/reassigned when a filter changes which series are
// shown. Written as literal class-name arrays (not template-string
// interpolation) so Tailwind's build-time scanner can see every class name
// it needs to generate — `` `stroke-${token}` `` with a runtime `token`
// would never match a literal source string and would silently compile to
// nothing, the same trap `app/globals.css`'s wiped default palette is
// designed to make loud elsewhere.
export const CHART_STROKE_CLASSES = [
  "stroke-chart-1",
  "stroke-chart-2",
  "stroke-chart-3",
  "stroke-chart-4",
  "stroke-chart-5",
] as const;

export const CHART_FILL_CLASSES = [
  "fill-chart-1",
  "fill-chart-2",
  "fill-chart-3",
  "fill-chart-4",
  "fill-chart-5",
] as const;

export const CHART_BG_CLASSES = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

export function chartColorIndex(seriesIndex: number): number {
  return seriesIndex % CHART_STROKE_CLASSES.length;
}
