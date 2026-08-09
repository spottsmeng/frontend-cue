"use client";

import { useEffectiveRoles } from "@/lib/roles";

import { SectionPanel } from "../living-wip/section-panel";
import { DeviationList } from "./deviation-list";
import { NotificationList } from "./notification-list";
import { QuietHoursPanel } from "./quiet-hours-panel";
import { RiskFeed } from "./risk-feed";
import { ThresholdConfigPanel } from "./threshold-config-panel";
import { WebhookAdminPanel } from "./webhook-admin-panel";

/**
 * PRD §6.9/§6.7/§6.15 (FR-FOR, FR-DEV, FR-NTF) — the real Foresight
 * surface F1's own Living WIP risk-and-issues section only ever
 * summarised. Same "sections as bounded panels" layout concept
 * DESIGN.md/Twin's own SectionPanel already establish, not a new layout
 * system for this one surface.
 *
 * Quiet-hours and threshold config live here (item 5's own judgment call,
 * documented in frontend/PROGRESS.md's F3 notes) rather than under Admin
 * (F7, not yet built) — both are Foresight-specific configuration, and F7
 * is explicitly told not to duplicate them, only to link here.
 */
export function ForesightView({ projectId }: { projectId: string }) {
  const { data: roles } = useEffectiveRoles(projectId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur">
        <span className="text-sm font-medium text-ink">Foresight</span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <SectionPanel title="Risks">
          <RiskFeed projectId={projectId} effectiveRoles={roles?.roles} />
        </SectionPanel>

        <SectionPanel title="Deviations">
          <DeviationList projectId={projectId} effectiveRoles={roles?.roles} />
        </SectionPanel>

        <SectionPanel title="Your notifications">
          <NotificationList projectId={projectId} />
        </SectionPanel>

        <SectionPanel title="Webhook subscriptions">
          <WebhookAdminPanel projectId={projectId} effectiveRoles={roles?.roles} />
        </SectionPanel>

        <SectionPanel title="Quiet hours">
          <QuietHoursPanel projectId={projectId} effectiveRoles={roles?.roles} />
        </SectionPanel>

        <SectionPanel title="Foresight thresholds">
          <ThresholdConfigPanel projectId={projectId} />
        </SectionPanel>
      </div>
    </div>
  );
}
