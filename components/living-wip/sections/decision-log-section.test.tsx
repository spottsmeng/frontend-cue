import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";

import { DecisionLogPanel } from "./decision-log-section";

// The review queue's whole job is triage. `verification_state` says a human
// has to look at a row and says nothing else, so every route into
// pending_verification — a price to confirm, a possible hallucination, a
// vendor that could not be identified — arrives the same colour unless the
// row states its own reason.
function approval(overrides: Record<string, unknown> = {}) {
  return {
    commitment_id: "c-1",
    deliverable_en: "LED screen install",
    party_name: "Ah Seng Production",
    due_at: null,
    amount: null,
    currency: null,
    verification_reasons: [] as string[],
    provenance: { source_type: "commitment", source_id: "c-1", label: "LED screen install" },
    ...overrides,
  };
}

function panel(approvals: ReturnType<typeof approval>[]) {
  return (
    <DecisionLogPanel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      section={{ decisions: [], outstanding_approvals: approvals } as any}
      onOpenCommitment={() => {}}
    />
  );
}

describe("DecisionLogPanel outstanding approvals", () => {
  it("names the vendor to chase, not just the deliverable", () => {
    render(panel([approval()]));
    expect(screen.getByText("Ah Seng Production")).toBeInTheDocument();
  });

  it("states why each row needs review", () => {
    render(panel([approval({ verification_reasons: ["monetary_field"] })]));
    expect(screen.getByText("price to confirm")).toBeInTheDocument();
  });

  it("renders every reason when a row has more than one", () => {
    render(
      panel([approval({ verification_reasons: ["monetary_field", "low_model_confidence"] })]),
    );
    expect(screen.getByText("price to confirm")).toBeInTheDocument();
    expect(screen.getByText("low confidence")).toBeInTheDocument();
  });

  it("shows an untranslated reason rather than hiding it", () => {
    // A reason added on the backend before its translation lands must be
    // visibly untranslated, not silently invisible — the failure mode would
    // otherwise be a row in the queue with no stated reason at all.
    render(panel([approval({ verification_reasons: ["some_future_reason"] })]));
    expect(screen.getByText("some_future_reason")).toBeInTheDocument();
  });

  it("renders no reason chips when a row carries none", () => {
    render(panel([approval()]));
    expect(screen.queryByText("price to confirm")).not.toBeInTheDocument();
  });
});
