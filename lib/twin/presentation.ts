import type { MilestoneOut, TwinCurrentOut } from "@/lib/api/types";

/**
 * Pure presentation logic over `TwinCurrentOut` + `MilestoneOut` — no
 * fetching, no React, so it's testable against hand-built fixtures without a
 * real backend call (this milestone's own TESTING EXPECTATION). `MilestoneOut`
 * itself doesn't carry slack/criticality (that's `TwinNodeOut`'s job, per
 * this prompt's own NON-OBVIOUS note) — `joinTwinNodes` is the one place
 * that join happens, by `milestone_id`, so every component downstream reads
 * one already-joined shape instead of re-deriving the join itself.
 */
export interface TimelineNode {
  milestoneId: string;
  name: string;
  typeTermId: string;
  isFixed: boolean;
  plannedAt: string | null;
  actualAt: string | null;
  earliest: string | null;
  latest: string | null;
  slackDays: number | null;
  isCritical: boolean;
}

/**
 * Timeline order, not graph layout — CUE-Tech-Stack.md §4's own "tens of
 * nodes... twenty lines of code, not a database" call, applied here as the
 * horizontal-timeline layout decision (frontend/PROGRESS.md's F2 notes).
 * Ordered by each node's own computed `earliest` (the CPM-derived date, not
 * the raw `planned_at` a PM may not have set) falling back to `planned_at`
 * for a node the Twin couldn't date at all (no predecessors, no planned_at
 * of its own), then name for full ties — deterministic either way.
 */
export function joinTwinNodes(milestones: MilestoneOut[], twin: TwinCurrentOut): TimelineNode[] {
  const byId = new Map(twin.nodes.map((n) => [n.milestone_id, n]));
  return milestones
    .map((m) => {
      const node = byId.get(m.id);
      return {
        milestoneId: m.id,
        name: m.name,
        typeTermId: m.type_term_id,
        isFixed: m.is_fixed,
        plannedAt: m.planned_at,
        actualAt: m.actual_at,
        earliest: node?.earliest ?? null,
        latest: node?.latest ?? null,
        slackDays: node?.slack_days ?? null,
        isCritical: node?.is_critical ?? false,
      };
    })
    .sort((a, b) => {
      const aDate = a.earliest ?? a.plannedAt;
      const bDate = b.earliest ?? b.plannedAt;
      if (aDate && bDate) return aDate.localeCompare(bDate);
      if (aDate) return -1;
      if (bDate) return 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * FR-TWN-11: a fixed milestone can't be pushed by any upstream slip, so it
 * is structurally different from every other node, never just a colour
 * variant of one — callers pair this with a lock icon and a distinct
 * border/shape, not only a tone change (this milestone's own NON-OBVIOUS
 * note). Criticality (red) and fixed-ness (locked) are independent axes: a
 * fixed node can be on or off the critical path (app/twin/graph.py's
 * `_binding_constraint` excludes fixed nodes from *constraint* candidacy,
 * but not from `critical_path` membership itself) — both this seed's own
 * "doors" (fixed, off critical path here since its slack is always exactly
 * 0 by construction) and a differently-shaped fixture could show either
 * combination, so this never collapses the two into one enum.
 */
export function nodeTone(node: Pick<TimelineNode, "isCritical">): "critical" | "good" {
  return node.isCritical ? "critical" : "good";
}

/**
 * `slackDays` is signed and can be negative (the network is already behind
 * — app/twin/graph.py's own module docstring: "zero... which can be
 * negative if the network is already behind"); null means the Twin couldn't
 * compute a slack figure for this node at all (e.g. no `earliest` or
 * `latest` resolvable). Every duration/slack number here comes from the
 * seeded archetype plus whatever a PM has since overridden, never a learned
 * duration distribution (FR-TWN-08 is unimplemented) — callers pair this
 * string with that framing near the number, not just this label alone.
 */
export function formatSlackDays(slackDays: number | null): string {
  if (slackDays === null) return "—";
  const rounded = Math.round(slackDays * 10) / 10;
  const magnitude = Number.isInteger(rounded) ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(1);
  if (rounded < 0) return `${magnitude}d behind`;
  if (rounded === 0) return "0d (critical)";
  return `${magnitude}d slack`;
}
