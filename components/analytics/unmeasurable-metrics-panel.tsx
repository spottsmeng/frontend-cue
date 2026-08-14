"use client";

import { useTranslations } from "next-intl";

import { NotYetMeasurable } from "@/components/charts/not-yet-measurable";

/**
 * The seven PRD §13 metrics with no real backend data source today — named
 * explicitly rather than omitted, per F8's own ethic ("a number on this
 * screen that isn't real is worse than a missing one"). Each blocker names
 * the real gap (see frontend/PROGRESS.md's F8 notes for the full
 * reasoning), not a generic "coming soon". Metric/blocker text lives in
 * `messages/{locale}/analytics.json` under `unmeasurableMetricsPanel` — this is
 * just the fixed display order.
 */
const UNMEASURABLE_METRIC_KEYS = [
  "coordinationOverhead",
  "statusMeetingDuration",
  "reportPreparationTime",
  "activeChatsPerPm",
  "contingencyDrawn",
  "captureRate",
  "extractionAccuracy",
] as const;

export function UnmeasurableMetricsPanel() {
  const t = useTranslations("analytics.unmeasurableMetricsPanel");
  return (
    <ul className="flex flex-col gap-2">
      {UNMEASURABLE_METRIC_KEYS.map((key) => (
        <li key={key}>
          <NotYetMeasurable metric={t(`${key}.metric`)} blocker={t(`${key}.blocker`)} />
        </li>
      ))}
    </ul>
  );
}
