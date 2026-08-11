"use client";

import { useMemo } from "react";

import { projectNameMap, useAnalyticsProjectsQuery } from "@/lib/analytics/hooks";

import { SectionPanel } from "@/components/living-wip/section-panel";

import { CostSummaryTable } from "./cost-summary-table";
import { MethodologyFootnote } from "./methodology-footnote";
import { UnmeasurableMetricsPanel } from "./unmeasurable-metrics-panel";
import { VerificationBurdenChart } from "./verification-burden-chart";
import { WritebackReplyRateChart } from "./writeback-reply-rate-chart";

/**
 * PRD §13's analytics dashboard — three real, live panels (verification
 * burden, write-back reply rate, cost per project) plus the seven
 * honestly-blocked metrics, composed under one methodology footnote.
 * `GET /projects` (already RLS-filtered to the caller) is fetched once
 * here, client-side — matching `app/(shell)/vendors/page.tsx`'s own
 * thin-client-wrapper pattern rather than duplicating the server-side fetch
 * `app/(shell)/layout.tsx` already does for the nav — and every panel below
 * fans its own requests out across the resulting project list.
 */
export function AnalyticsView() {
  const { data: projects, isLoading, isError } = useAnalyticsProjectsQuery();
  const projectIds = useMemo(() => (projects ?? []).map((p) => p.id), [projects]);
  const projectsById = useMemo(() => projectNameMap(projects), [projects]);

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-4">
        <p className="text-sm text-critical">Could not load your projects. Please retry.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4">
      <MethodologyFootnote />

      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading your projects…</p>
      ) : projectIds.length === 0 ? (
        <p className="text-sm text-ink-muted">
          You aren&apos;t a member of any project yet, so there&apos;s nothing to chart here.
        </p>
      ) : (
        <>
          <SectionPanel title="Verification burden">
            <VerificationBurdenChart projectIds={projectIds} projectsById={projectsById} />
          </SectionPanel>

          <SectionPanel title="Write-back reply rate">
            <WritebackReplyRateChart projectIds={projectIds} projectsById={projectsById} />
          </SectionPanel>
        </>
      )}

      <SectionPanel title="Cost per active project">
        <CostSummaryTable projectsById={projectsById} />
      </SectionPanel>

      <SectionPanel title="Not yet measurable">
        <UnmeasurableMetricsPanel />
      </SectionPanel>
    </div>
  );
}
