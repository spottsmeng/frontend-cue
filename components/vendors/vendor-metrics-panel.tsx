"use client";

import { useTranslations } from "next-intl";

import { VendorPermissionError, useVendorReliabilityQuery } from "@/lib/vendors/hooks";
import type { VendorSegment } from "@/lib/vendors/hooks";

import { METRIC_NAMES } from "./metric-meta";
import { SegmentPicker } from "./segment-picker";
import { VendorMetricRow } from "./vendor-metric-row";

/**
 * FR-VRG-01/02: all five metrics for one segment, with a picker that
 * re-queries on change (this milestone's own WHAT TO BUILD #2). `segment`
 * is lifted to VendorDetailView, not owned here — the history trend below
 * shares the same `event_archetype` value, per its own endpoint's identical
 * query param. A 403 here (a project_manager-only user who reached this
 * page by URL, nav entry hidden or not) renders as an explainable
 * permission message, the same `ForesightPermissionError`/
 * `ThresholdConfigPanel` pattern F3 already established, not a generic
 * failure.
 */
export function VendorMetricsPanel({
  partyId,
  segment,
  onSegmentChange,
}: {
  partyId: string;
  segment: VendorSegment;
  onSegmentChange: (segment: VendorSegment) => void;
}) {
  const t = useTranslations("vendors.vendorMetricsPanel");
  const { data, isLoading, isError, error } = useVendorReliabilityQuery(partyId, segment);

  if (isError) {
    if (error instanceof VendorPermissionError) {
      return (
        <p className="text-sm text-ink-muted">
          {t("financeOnly")}
        </p>
      );
    }
    return <p className="text-sm text-critical">{t("loadError")}</p>;
  }

  const byMetric = new Map((data?.metrics ?? []).map((m) => [m.metric, m]));

  return (
    <div className="flex flex-col gap-4">
      <SegmentPicker segment={segment} onChange={onSegmentChange} />
      {isLoading ? (
        <p className="text-sm text-ink-muted">{t("loading")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {METRIC_NAMES.map((metric) => (
            <VendorMetricRow key={metric} metric={metric} snapshot={byMetric.get(metric) ?? null} />
          ))}
        </ul>
      )}
    </div>
  );
}
