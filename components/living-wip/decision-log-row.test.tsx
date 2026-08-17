import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";
import type { DecisionLogRow as DecisionLogRowT } from "@/lib/api/types";

import { DecisionLogRow, formatDecisionDetail } from "./decision-log-row";

function decision(overrides: Partial<DecisionLogRowT>): DecisionLogRowT {
  return {
    audit_log_id: "a1",
    commitment_id: "c1",
    action: "corrected",
    actor_id: "u1",
    occurred_at: "2026-08-10T09:00:00Z",
    from_state: null,
    to_state: null,
    detail: {},
    provenance: { source_type: "audit_log", source_id: "a1" },
    ...overrides,
  };
}

// Blind Spots item 7: AuditLog.detail — a correction's before/after diff
// existed in the database the whole time; neither the Decision Log nor the
// Successor Brief (which renders this same component) ever read it back.
describe("formatDecisionDetail", () => {
  it("renders a changes diff as field: before → after", () => {
    const lines = formatDecisionDetail({
      changes: { deliverable_en: { before: "LED screen install", after: "LED wall install" } },
    });
    expect(lines).toEqual([
      { key: "deliverable_en", text: "deliverable_en: LED screen install → LED wall install" },
    ]);
  });

  it("falls back to key: value for a detail shape with no changes diff", () => {
    const lines = formatDecisionDetail({ trigger: "silence" });
    expect(lines).toEqual([{ key: "trigger", text: "trigger: silence" }]);
  });

  it("renders nothing for an empty detail object", () => {
    expect(formatDecisionDetail({})).toEqual([]);
  });

  it("renders — for a null before/after value", () => {
    const lines = formatDecisionDetail({ changes: { amount: { before: null, after: 500 } } });
    expect(lines).toEqual([{ key: "amount", text: "amount: — → 500" }]);
  });
});

describe("DecisionLogRow", () => {
  it("renders the correction diff inline for a commitment correction", () => {
    render(
      <DecisionLogRow
        decision={decision({
          detail: { changes: { deliverable_en: { before: "LED screen install", after: "LED wall install" } } },
        })}
        onOpenCommitment={vi.fn()}
      />,
    );
    expect(screen.getByText("deliverable_en: LED screen install → LED wall install")).toBeInTheDocument();
  });

  it("renders no detail block for a plain confirmation with empty detail", () => {
    render(<DecisionLogRow decision={decision({ action: "verified", detail: {} })} onOpenCommitment={vi.fn()} />);
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });
});
