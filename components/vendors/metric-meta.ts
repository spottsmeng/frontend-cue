import type { VendorMetricName } from "@/lib/api/types";

/**
 * `VendorMetricNameLiteral`'s five values, in the fixed display order this
 * milestone's own WHAT TO BUILD names them (app/parties/schema.py) — the
 * canonical list every metrics panel iterates over, so a metric genuinely
 * *absent* from a `VendorReliabilityOut.metrics` response (never computed
 * at all — see that field's own docstring) still gets a row, distinct from
 * one that's present with `available=False`. Mirrors backend/app/parties/
 * service.py's `_METRIC_FUNCS` order exactly, not alphabetical.
 */
export const METRIC_NAMES: VendorMetricName[] = [
  "median_response_time_days",
  "on_time_rate",
  "revision_churn",
  "price_drift_pct",
  "deviation_frequency",
];

export const METRIC_LABEL: Record<VendorMetricName, string> = {
  median_response_time_days: "Median response time",
  on_time_rate: "On-time rate",
  revision_churn: "Revision churn",
  price_drift_pct: "Price drift",
  deviation_frequency: "Deviation frequency",
};

/**
 * `on_time_rate`/`revision_churn` are fractions (0..1) computed by
 * app/parties/compute.py; `price_drift_pct` is already a percentage
 * (`* 100.0` in compute_price_drift, its own name says so) — formatting
 * both the same way would silently double- or under-scale one of them, so
 * this is a per-metric function, not one shared percent formatter.
 */
export function formatMetricValue(metric: VendorMetricName, value: number): string {
  switch (metric) {
    case "median_response_time_days":
      return `${value.toFixed(1)} days`;
    case "on_time_rate":
    case "revision_churn":
      return `${(value * 100).toFixed(0)}%`;
    case "price_drift_pct":
      return `${value.toFixed(1)}%`;
    case "deviation_frequency":
      return `${value.toFixed(2)} per commitment`;
  }
}
