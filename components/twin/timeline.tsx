import type { TimelineNode } from "@/lib/twin/presentation";

import { EmptyState } from "../living-wip/empty-state";
import { TimelineNodeRow } from "./timeline-node";

/**
 * The timeline-vs-graph layout call this milestone's own prompt asks to
 * make deliberately (frontend/PROGRESS.md's F2 notes has the full
 * reasoning): a vertical, chronologically-ordered rail rather than a
 * horizontal Gantt bar-chart. Milestones are date-ordered events with
 * dependency edges, not an arbitrary relationship graph
 * (CUE-Tech-Stack.md §4's own "tens of nodes... twenty lines of code, not a
 * database"), so a single top-to-bottom walk in earliest-date order — the
 * same "stable document" reading pattern DESIGN.md's layout concept already
 * uses for Living WIP — reads the whole sequence at a glance without a
 * fixed-width date scale or horizontal scrolling once a project has two
 * dozen milestones with real names, which a literal left-to-right Gantt
 * would force. Dependency *edges* themselves (upstream/downstream/lag) are
 * a separate section below, not drawn as connectors here — overlaying both
 * concerns on one rail would fight the same "one clear scale" reasoning
 * that ruled out a force-directed graph in the first place.
 */
export function Timeline({
  nodes,
  onSelect,
}: {
  nodes: TimelineNode[];
  onSelect: (milestoneId: string) => void;
}) {
  if (nodes.length === 0) {
    return <EmptyState message="No milestones on this project's Twin yet." />;
  }
  return (
    <ol className="flex flex-col">
      {nodes.map((node, i) => (
        <TimelineNodeRow
          key={node.milestoneId}
          node={node}
          isLast={i === nodes.length - 1}
          onSelect={() => onSelect(node.milestoneId)}
        />
      ))}
    </ol>
  );
}
