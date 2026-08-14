"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useEffectiveRoles } from "@/lib/roles";
import { joinTwinNodes } from "@/lib/twin/presentation";
import {
  useDependenciesQuery,
  useMilestonesQuery,
  useMilestoneTypeTermsQuery,
  useTwinConstraintQuery,
  useTwinCurrentQuery,
} from "@/lib/twin/hooks";

import { SectionPanel } from "../living-wip/section-panel";
import { AddMilestoneForm } from "./add-milestone-form";
import { ConstraintBanner } from "./constraint-banner";
import { DependencyPanel } from "./dependency-panel";
import { MilestoneDetailPanel } from "./milestone-detail-panel";
import { PropagationSimulator } from "./propagation-simulator";
import { RecomputeButton } from "./recompute-button";
import { Timeline } from "./timeline";

/**
 * FR-TWN: the dependency graph/timeline, milestone editing, dependency
 * editing and the propagation ("what if X slips") simulator — PRD §6.8.
 * Layout call (documented in full in frontend/PROGRESS.md's F2 notes): a
 * vertical timeline rather than a horizontal Gantt or a force-directed
 * graph, per CUE-Tech-Stack.md §4's own "tens of nodes... not a database"
 * scale note.
 */
export function TwinView({ projectId }: { projectId: string }) {
  const t = useTranslations("twin.view");
  const { data: milestones, isLoading: milestonesLoading, isError: milestonesError } =
    useMilestonesQuery(projectId);
  const { data: dependencies, isLoading: dependenciesLoading } = useDependenciesQuery(projectId);
  const { data: twinCurrent, isLoading: twinLoading, isError: twinError } = useTwinCurrentQuery(projectId);
  const { data: constraint } = useTwinConstraintQuery(projectId);
  const { data: roles } = useEffectiveRoles(projectId);
  // F9 gap-audit fix: same query AddMilestoneForm below already fetches
  // (dedup'd by TanStack Query's own cache, not a second network call) —
  // closes F2's own documented milestone-type-never-displayed debt.
  const { data: milestoneTypes } = useMilestoneTypeTermsQuery(projectId);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  const isLoading = milestonesLoading || dependenciesLoading || twinLoading;
  const isError = milestonesError || twinError;

  if (isLoading) {
    return <p className="p-6 text-sm text-ink-muted">{t("loading")}</p>;
  }
  if (isError || !milestones || !dependencies || !twinCurrent) {
    return <p className="p-6 text-sm text-critical">{t("error")}</p>;
  }

  const nodes = joinTwinNodes(milestones, twinCurrent);
  const milestonesById = new Map(milestones.map((m) => [m.id, m]));
  const selectedMilestone = selectedMilestoneId ? milestonesById.get(selectedMilestoneId) : undefined;
  const selectedNode = selectedMilestoneId
    ? nodes.find((n) => n.milestoneId === selectedMilestoneId)
    : undefined;
  const constraintMilestone = constraint?.binding_constraint
    ? milestonesById.get(constraint.binding_constraint)
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur">
        <span className="text-sm font-medium text-ink">{t("title")}</span>
        <RecomputeButton projectId={projectId} />
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <ConstraintBanner
          milestoneName={constraintMilestone?.name ?? null}
          slackDays={constraint?.slack_days ?? null}
        />

        <SectionPanel title={t("sections.timeline")} action={<AddMilestoneForm projectId={projectId} effectiveRoles={roles?.roles} />}>
          <Timeline nodes={nodes} milestoneTypes={milestoneTypes} onSelect={setSelectedMilestoneId} />
        </SectionPanel>

        <SectionPanel title={t("sections.dependencies")}>
          <DependencyPanel
            projectId={projectId}
            milestones={milestones}
            dependencies={dependencies}
            effectiveRoles={roles?.roles}
          />
        </SectionPanel>

        <SectionPanel title={t("sections.propagationSimulator")}>
          <PropagationSimulator
            projectId={projectId}
            milestones={milestones}
            currentBindingConstraintId={constraint?.binding_constraint ?? null}
          />
        </SectionPanel>
      </div>

      {selectedMilestone && (
        <MilestoneDetailPanel
          projectId={projectId}
          milestone={selectedMilestone}
          node={selectedNode}
          dependencies={dependencies}
          milestonesById={milestonesById}
          milestoneTypes={milestoneTypes}
          effectiveRoles={roles?.roles}
          onClose={() => setSelectedMilestoneId(null)}
        />
      )}
    </div>
  );
}
