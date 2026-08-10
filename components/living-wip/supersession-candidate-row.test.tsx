import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CommitmentOut, CommitmentSupersessionCandidateOut } from "@/lib/api/types";

import { SupersessionCandidateRow } from "./supersession-candidate-row";

const { useCommitmentQuery, useConfirmSupersessionCandidateMutation, useRejectSupersessionCandidateMutation } =
  vi.hoisted(() => ({
    useCommitmentQuery: vi.fn(),
    useConfirmSupersessionCandidateMutation: vi.fn(),
    useRejectSupersessionCandidateMutation: vi.fn(),
  }));
vi.mock("@/lib/commitments/hooks", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/commitments/hooks")>();
  return {
    ...actual,
    useCommitmentQuery,
    useConfirmSupersessionCandidateMutation,
    useRejectSupersessionCandidateMutation,
  };
});

function baseMutation() {
  return { mutate: vi.fn(), isPending: false, isError: false };
}

function makeCommitment(overrides: Partial<CommitmentOut> = {}): CommitmentOut {
  return {
    id: "c-1", project_id: "p-1", party_id: "party-1", counterparty_id: "party-2",
    deliverable_id: null, act_type_id: "act-1", state: "committed",
    deliverable_en: "LED wall rental — main stage", deliverable_original: null,
    due_at: null, amount: 18500, currency: "SGD", payment_status: null,
    confidence: 1, field_confidence: {}, verification_state: "human_verified",
    verified_by: null, verified_at: null, created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z", evidence: [],
    ...overrides,
  };
}

function makeCandidate(
  overrides: Partial<CommitmentSupersessionCandidateOut> = {},
): CommitmentSupersessionCandidateOut {
  return {
    id: "cand-1", project_id: "p-1", commitment_id: "c-2", supersedes_commitment_id: "c-1",
    reasoning: "Same deliverable, price increased from 18500 to 21000.",
    status: "pending", reviewed_by: null, reviewed_at: null,
    created_at: "2026-08-10T00:00:00Z", updated_at: "2026-08-10T00:00:00Z",
    ...overrides,
  };
}

// This milestone's own core testable behaviour: an honest "not specified"
// for a null amount (never a fabricated $0, same discipline every other
// money-rendering component in this codebase already holds), and the
// confirm/reject actions only ever showing for a write-role viewer on a
// still-pending candidate — never on an already-decided one.
describe("SupersessionCandidateRow", () => {
  it("renders both commitments' real amounts as was → now", () => {
    useCommitmentQuery.mockImplementation((_projectId: string, commitmentId: string) => ({
      data: commitmentId === "c-2" ? makeCommitment({ id: "c-2", amount: 21000 }) : makeCommitment({ id: "c-1", amount: 18500 }),
    }));
    useConfirmSupersessionCandidateMutation.mockReturnValue(baseMutation());
    useRejectSupersessionCandidateMutation.mockReturnValue(baseMutation());

    render(
      <SupersessionCandidateRow projectId="p-1" candidate={makeCandidate()} effectiveRoles={["producer"]} />,
    );

    expect(screen.getByText(/was/)).toHaveTextContent("was $18,500.00");
    expect(screen.getByText(/now/)).toHaveTextContent("now $21,000.00");
    expect(screen.getByText(/price increased/)).toBeInTheDocument();
  });

  it("renders 'not specified' honestly for a null amount, never a fabricated $0", () => {
    useCommitmentQuery.mockImplementation((_projectId: string, commitmentId: string) => ({
      data: commitmentId === "c-2" ? makeCommitment({ id: "c-2", amount: null }) : makeCommitment({ id: "c-1", amount: null }),
    }));
    useConfirmSupersessionCandidateMutation.mockReturnValue(baseMutation());
    useRejectSupersessionCandidateMutation.mockReturnValue(baseMutation());

    render(
      <SupersessionCandidateRow projectId="p-1" candidate={makeCandidate()} effectiveRoles={["producer"]} />,
    );

    expect(screen.getByText(/was/)).toHaveTextContent("was not specified");
    expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
  });

  it("shows confirm/reject actions for a write-role viewer on a pending candidate", () => {
    useCommitmentQuery.mockReturnValue({ data: makeCommitment() });
    useConfirmSupersessionCandidateMutation.mockReturnValue(baseMutation());
    useRejectSupersessionCandidateMutation.mockReturnValue(baseMutation());

    render(
      <SupersessionCandidateRow projectId="p-1" candidate={makeCandidate()} effectiveRoles={["producer"]} />,
    );

    expect(screen.getByRole("button", { name: /Confirm/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject/ })).toBeInTheDocument();
  });

  it("hides confirm/reject actions for a read-only viewer", () => {
    useCommitmentQuery.mockReturnValue({ data: makeCommitment() });
    useConfirmSupersessionCandidateMutation.mockReturnValue(baseMutation());
    useRejectSupersessionCandidateMutation.mockReturnValue(baseMutation());

    render(
      <SupersessionCandidateRow projectId="p-1" candidate={makeCandidate()} effectiveRoles={["read_only"]} />,
    );

    expect(screen.queryByRole("button", { name: /Confirm/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reject/ })).not.toBeInTheDocument();
  });

  it("hides confirm/reject actions and shows the real outcome once already confirmed", () => {
    useCommitmentQuery.mockReturnValue({ data: makeCommitment() });
    useConfirmSupersessionCandidateMutation.mockReturnValue(baseMutation());
    useRejectSupersessionCandidateMutation.mockReturnValue(baseMutation());

    render(
      <SupersessionCandidateRow
        projectId="p-1"
        candidate={makeCandidate({ status: "confirmed" })}
        effectiveRoles={["producer"]}
      />,
    );

    expect(screen.queryByRole("button", { name: /Confirm/ })).not.toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });
});
