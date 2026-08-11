import { CHART_BG_CLASSES, chartColorIndex } from "./chart-colors";

/**
 * `dataviz` skill: "≥ 2 series a legend is always present" — identity is
 * never color-alone. A single series doesn't reach this component (its
 * chart title already names it).
 */
export function ChartLegend({ items }: { items: { id: string; label: string }[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item, i) => (
        <li key={item.id} className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${CHART_BG_CLASSES[chartColorIndex(i)]}`}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
