import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

// This milestone's own TESTING EXPECTATION names critical-path highlighting,
// fixed-node styling and slack formatting explicitly — rendered against
// hand-built TwinCurrentOut-shaped nodes (via lib/twin/presentation's own
// TimelineNode join shape), not a real backend call.
describe("TimelineNodeRow", () => {
  it("renders a critical-path node with the critical badge and red slack text", () => {
    render(
      <ol>
        <TimelineNodeRow node={node({ isCritical: true, slackDays: -4 })} isLast onSelect={() => {}} />
      </ol>,
    );
    expect(screen.getByText("critical path")).toBeInTheDocument();
    expect(screen.getByText("4d behind")).toHaveClass("text-critical");
  });

  it("does not render the critical badge for an off-critical-path node", () => {
    render(
      <ol>
        <TimelineNodeRow node={node({ isCritical: false, slackDays: 4 })} isLast onSelect={() => {}} />
      </ol>,
    );
    expect(screen.queryByText("critical path")).not.toBeInTheDocument();
    expect(screen.getByText("4d slack")).not.toHaveClass("text-critical");
  });

  it("renders a fixed node with a distinct lock marker and 'fixed' badge, independent of criticality", () => {
    render(
      <ol>
        <TimelineNodeRow node={node({ isFixed: true, isCritical: false, slackDays: 0 })} isLast onSelect={() => {}} />
      </ol>,
    );
    expect(screen.getByText("fixed")).toBeInTheDocument();
    expect(screen.getByTitle("Fixed — cannot be pushed by an upstream slip")).toBeInTheDocument();
    expect(screen.getByText("0d (critical)")).toBeInTheDocument();
  });

  it("formats an unresolvable slack figure as an em dash", () => {
    render(
      <ol>
        <TimelineNodeRow node={node({ slackDays: null })} isLast onSelect={() => {}} />
      </ol>,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("invokes onSelect when the row is activated", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ol>
        <TimelineNodeRow node={node({})} isLast onSelect={onSelect} />
      </ol>,
    );
    await user.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
