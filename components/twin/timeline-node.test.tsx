import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";
import type { OntologyTermOut } from "@/lib/api/types";
import type { TimelineNode } from "@/lib/twin/presentation";

import { TimelineNodeRow } from "./timeline-node";

function node(overrides: Partial<TimelineNode>): TimelineNode {
  return {
    milestoneId: "m1",
    name: "Rigging",
    typeTermId: "t1",
    isFixed: false,
    plannedAt: "2026-06-01T00:00:00Z",
    actualAt: null,
    earliest: "2026-06-01T00:00:00Z",
    latest: "2026-06-05T00:00:00Z",
    slackDays: 4,
    isCritical: false,
    ...overrides,
  };
}

const TYPES: OntologyTermOut[] = [
  { id: "t1", code: "structural", label_en: "Structural", label_zh: "结构", sort_order: 0 },
];

// This milestone's own TESTING EXPECTATION names critical-path highlighting,
// fixed-node styling and slack formatting explicitly — rendered against
// hand-built TwinCurrentOut-shaped nodes (via lib/twin/presentation's own
// TimelineNode join shape), not a real backend call.
describe("TimelineNodeRow", () => {
  it("renders a critical-path node with the critical badge and red slack text", () => {
    render(
      <ol>
        <TimelineNodeRow
          node={node({ isCritical: true, slackDays: -4 })}
          milestoneTypes={TYPES}
          isLast
          onSelect={() => {}}
        />
      </ol>,
    );
    expect(screen.getByText("critical path")).toBeInTheDocument();
    expect(screen.getByText("4d behind")).toHaveClass("text-critical");
  });

  it("does not render the critical badge for an off-critical-path node", () => {
    render(
      <ol>
        <TimelineNodeRow
          node={node({ isCritical: false, slackDays: 4 })}
          milestoneTypes={TYPES}
          isLast
          onSelect={() => {}}
        />
      </ol>,
    );
    expect(screen.queryByText("critical path")).not.toBeInTheDocument();
    expect(screen.getByText("4d slack")).not.toHaveClass("text-critical");
  });

  it("renders a fixed node with a distinct lock marker and 'fixed' badge, independent of criticality", () => {
    render(
      <ol>
        <TimelineNodeRow
          node={node({ isFixed: true, isCritical: false, slackDays: 0 })}
          milestoneTypes={TYPES}
          isLast
          onSelect={() => {}}
        />
      </ol>,
    );
    expect(screen.getByText("fixed")).toBeInTheDocument();
    expect(screen.getByTitle("Fixed — cannot be pushed by an upstream slip")).toBeInTheDocument();
    expect(screen.getByText("0d (critical)")).toBeInTheDocument();
  });

  it("formats an unresolvable slack figure as an em dash", () => {
    render(
      <ol>
        <TimelineNodeRow node={node({ slackDays: null })} milestoneTypes={TYPES} isLast onSelect={() => {}} />
      </ol>,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("invokes onSelect when the row is activated", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ol>
        <TimelineNodeRow node={node({})} milestoneTypes={TYPES} isLast onSelect={onSelect} />
      </ol>,
    );
    await user.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  // F9 gap-audit fix: F2's own documented debt — a milestone's type had no
  // resolver anywhere and was never displayed at all.
  it("resolves and renders the milestone's own type label when the terms list is available", () => {
    render(
      <ol>
        <TimelineNodeRow node={node({ typeTermId: "t1" })} milestoneTypes={TYPES} isLast onSelect={() => {}} />
      </ol>,
    );
    expect(screen.getByText("Structural")).toBeInTheDocument();
  });

  it("renders no type badge when the terms list hasn't loaded yet", () => {
    render(
      <ol>
        <TimelineNodeRow node={node({ typeTermId: "t1" })} milestoneTypes={undefined} isLast onSelect={() => {}} />
      </ol>,
    );
    expect(screen.queryByText("Structural")).not.toBeInTheDocument();
  });
});
