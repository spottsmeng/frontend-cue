"use client";

import { useTranslations } from "next-intl";

import { formatDateTime } from "@/lib/format";
import type { VendorMetricName, VendorMetricOut } from "@/lib/api/types";

import { METRIC_LABEL, formatMetricValue } from "./metric-meta";

/**
 * `VendorMetricOut`'s own docstring (app/parties/schema.py): a metric
 * *absent* from `VendorReliabilityOut.metrics` (never computed at all —
 * recompute never ran for this party/segment) is a structurally different
 * case from one *present* with `available=False` (computed, but
 * structurally can't report a value yet, e.g. FR-LED-05's supersedes chain
 * not existing). This milestone's own instruction: render them
 * differently — absent needs no reason shown (nothing to explain), present-
 * unavailable should show its real `unavailable_reason`, never a fabricated
 * value. `snapshot === null` is the absent case; the caller (VendorMetricsPanel)
 * decides that by checking whether this metric name appears in the fetched list.
 */
export function VendorMetricRow({
  metric,
  snapshot,
}: {
  metric: VendorMetricName;
  snapshot: VendorMetricOut | null;
}) {
  const t = useTranslations("vendors.vendorMetricRow");
  return (
    <li className="flex flex-col gap-0.5 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">{METRIC_LABEL[metric]}</span>
        {snapshot === null ? (
          <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-xs font-medium text-ink-muted">
            {t("notYetComputed")}
          </span>
        ) : snapshot.available && snapshot.value !== null ? (
          <span className="font-mono text-sm font-semibold text-ink">
            {formatMetricValue(metric, snapshot.value)}
          </span>
        ) : (
          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
            {t("notAvailable")}
          </span>
        )}
      </div>

      {snapshot === null && (
        <p className="text-xs text-ink-muted">
          {t("neverComputed")}
        </p>
      )}
      {snapshot !== null && !snapshot.available && (
        <p className="text-xs text-ink-muted">{snapshot.unavailable_reason}</p>
      )}
      {snapshot !== null && snapshot.available && (
        <p className="font-mono text-xs text-ink-muted">
          {t("computedMeta", { count: snapshot.sample_size, date: formatDateTime(snapshot.computed_at) })}
        </p>
      )}
    </li>
  );
}
