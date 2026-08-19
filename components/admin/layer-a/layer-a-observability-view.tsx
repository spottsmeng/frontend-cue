"use client";

import { useTranslations } from "next-intl";

import { SectionPanel } from "../../living-wip/section-panel";
import { LayerAAlertConfigPanel } from "./layer-a-alert-config-panel";
import { LayerAAlertHistoryPanel } from "./layer-a-alert-history-panel";
import { LayerALiveStatusPanel } from "./layer-a-live-status-panel";
import { LayerATrendPanel } from "./layer-a-trend-panel";

/**
 * task-layer-A-observability-dashboard-prompt.txt — "make an incident like
 * [the two-process WhatsApp session conflict] diagnosable from a dashboard
 * the next morning." Four panels: live status (what's happening right now,
 * proxied from Layer A live), historical trend (why persistence matters —
 * beyond Layer A's own 200-entry in-memory ring buffer), alert history (the
 * three named alert types, reviewable not fired-and-forgotten), and alert
 * configuration (thresholds/destinations, admin-UI-editable at runtime, not
 * env-only). AnalyticsView-shaped composition root — thin, no query of its
 * own, each panel owns its own data fetching/loading/error states.
 */
export function LayerAObservabilityView() {
  const t = useTranslations("admin.layerA");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
      <SectionPanel title={t("liveStatus.title")}>
        <LayerALiveStatusPanel />
      </SectionPanel>
      <SectionPanel title={t("trend.title")}>
        <LayerATrendPanel />
      </SectionPanel>
      <SectionPanel title={t("alertHistory.title")}>
        <LayerAAlertHistoryPanel />
      </SectionPanel>
      <SectionPanel title={t("config.title")}>
        <LayerAAlertConfigPanel />
      </SectionPanel>
    </div>
  );
}
