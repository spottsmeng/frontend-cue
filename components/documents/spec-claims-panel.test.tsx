import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";
import type { SpecClaimOut } from "@/lib/api/types";

import { SpecClaimRow } from "./spec-claims-panel";

function claim(overrides: Partial<SpecClaimOut>): SpecClaimOut {
  return {
    id: "c1",
    document_version_id: "v1",
    deliverable_id: null,
    location_code: "H",
    attribute: "dimension",
    value: "2040mm x 1040mm",
    contradicts: null,
    confidence: 0.92,
    evidence: [],
    ...overrides,
  };
}

// Blind Spots item 4: SpecClaim.confidence — extracted, persisted, and (as
// of this round) rendered; a manually-entered claim has none to show.
describe("SpecClaimRow", () => {
  it("shows the extraction model's own confidence for an extracted claim", () => {
    render(<SpecClaimRow projectId="p1" claim={claim({ confidence: 0.92 })} />);
    expect(screen.getByText("confidence 92%")).toBeInTheDocument();
  });

  it("shows no confidence badge for a claim with none recorded", () => {
    render(<SpecClaimRow projectId="p1" claim={claim({ confidence: null })} />);
    expect(screen.queryByText(/confidence/)).not.toBeInTheDocument();
  });
});
