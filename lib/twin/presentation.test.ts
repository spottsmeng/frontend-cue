import { describe, expect, it } from "vitest";

import type { MilestoneOut, TwinCurrentOut } from "@/lib/api/types";

import { formatSlackDays, joinTwinNodes, nodeTone } from "./presentation";

function milestone(overrides: Partial<MilestoneOut> & { id: string; name: string }): MilestoneOut {
  return {
    project_id: "project-1",
    type_term_id: "type-1",
    planned_at: null,
    actual_at: null,
    is_fixed: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// Hand-built TwinCurrentOut-shaped fixture — this milestone's own TESTING
// EXPECTATION names exactly this ("Vitest for the CPM-result rendering
// logic... against hand-built TwinCurrentOut-shaped fixtures") rather than a
// real backend call. Mirrors the actual dev-seed shape (frontend/PROGRESS.md's
// F2 notes): a two-day-critical node, a slower parallel branch that becomes
// critical, and a fixed node holding exactly zero slack regardless.
const twin: TwinCurrentOut = {
  nodes: [
    { milestone_id: "load-in", earliest: "2026-06-01T00:00:00Z", latest: "2026-06-01T00:00:00Z", slack_days: -4, is_critical: true },
    { milestone_id: "rigging", earliest: "2026-06-01T00:00:00Z", latest: "2026-06-01T00:00:00Z", slack_days: 0, is_critical: false },
    { milestone_id: "generator", earliest: "2026-06-06T00:00:00Z", latest: "2026-06-02T00:00:00Z", slack_days: -4, is_critical: true },
    { milestone_id: "doors", earliest: "2026-07-01T00:00:00Z", latest: "2026-07-01T00:00:00Z", slack_days: 0, is_critical: false },
  ],
  critical_path: ["load-in", "generator"],
  binding_constraint: "load-in",
};

const milestones: MilestoneOut[] = [
  milestone({ id: "doors", name: "Exhibition opens", is_fixed: true, planned_at: "2026-07-01T00:00:00Z" }),
  milestone({ id: "load-in", name: "Exhibits move in", planned_at: "2026-06-01T00:00:00Z" }),
  milestone({ id: "rigging", name: "Rigging", planned_at: "2026-06-01T00:00:00Z" }),
  milestone({ id: "generator", name: "Backup generator delivery", planned_at: "2026-06-06T00:00:00Z" }),
];

describe("joinTwinNodes", () => {
  it("joins each milestone to its own TwinNodeOut by milestone_id", () => {
    const nodes = joinTwinNodes(milestones, twin);
    const doors = nodes.find((n) => n.milestoneId === "doors")!;
    expect(doors.isFixed).toBe(true);
    expect(doors.slackDays).toBe(0);
    expect(doors.isCritical).toBe(false);

    const generator = nodes.find((n) => n.milestoneId === "generator")!;
    expect(generator.slackDays).toBe(-4);
    expect(generator.isCritical).toBe(true);
  });

  it("orders by each node's own computed earliest date, not milestone list order", () => {
    const nodes = joinTwinNodes(milestones, twin);
    // Input order above is doors, load-in, rigging, generator — earliest-date
    // order pulls doors to the end (its 07-01 is latest) even though it was
    // listed first; load-in/rigging tie on earliest (both 06-01) and keep
    // their original relative order (a stable sort), then generator (06-06).
    expect(nodes.map((n) => n.milestoneId)).toEqual(["load-in", "rigging", "generator", "doors"]);
  });

  it("falls back to planned_at, then name, when a milestone has no TwinNodeOut counterpart", () => {
    const orphan = milestone({ id: "orphan", name: "Unlinked milestone", planned_at: null });
    const nodes = joinTwinNodes([...milestones, orphan], twin);
    const orphanNode = nodes.find((n) => n.milestoneId === "orphan")!;
    expect(orphanNode.earliest).toBeNull();
    expect(orphanNode.slackDays).toBeNull();
    expect(orphanNode.isCritical).toBe(false);
    // No date at all sorts last, after every dated node.
    expect(nodes.at(-1)!.milestoneId).toBe("orphan");
  });
});

describe("nodeTone", () => {
  it("marks a critical-path node distinctly from an off-critical-path one", () => {
    expect(nodeTone({ isCritical: true })).toBe("critical");
    expect(nodeTone({ isCritical: false })).toBe("good");
  });
});

describe("formatSlackDays", () => {
  it("renders null as an em dash — no slack figure computable", () => {
    expect(formatSlackDays(null)).toBe("—");
  });

  it("renders negative slack as 'behind', not a bare negative number", () => {
    expect(formatSlackDays(-4)).toBe("4d behind");
  });

  it("renders exactly zero slack as the critical-path case", () => {
    expect(formatSlackDays(0)).toBe("0d (critical)");
  });

  it("renders positive slack with the slack label", () => {
    expect(formatSlackDays(6)).toBe("6d slack");
  });

  it("rounds to one decimal place for fractional slack", () => {
    expect(formatSlackDays(2.449)).toBe("2.4d slack");
    expect(formatSlackDays(-1.25)).toBe("1.2d behind");
  });
});
