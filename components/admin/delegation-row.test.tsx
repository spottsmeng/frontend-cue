import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";
import type { DelegationOut } from "@/lib/api/types";

import { DelegationRow } from "./delegation-row";

function makeDelegation(overrides: Partial<DelegationOut> = {}): DelegationOut {
  return {
    id: "d-1",
    project_id: "p-1",
    delegator_id: "u-delegator",
    delegate_id: "u-delegate",
    role: "producer",
    granted_at: "2026-08-01T00:00:00Z",
    granted_by: "u-delegator",
    expires_at: "2099-01-01T00:00:00Z",
    revoked_at: null,
    revoked_by: null,
    ...overrides,
  };
}

// This milestone's own named TESTING EXPECTATION: "the delegation
// expiry/scope display." Every case renders real resolved names, never a
// raw uuid — the exact mistake Prompt F7's own NON-OBVIOUS note flags for
// DelegationOut's four id columns.
describe("DelegationRow", () => {
  it("shows an active, not-yet-expired delegation with its role scope and a Revoke control", () => {
    render(
      <DelegationRow
        delegation={makeDelegation()}
        delegatorLabel="Ada Lovelace"
        delegateLabel="Grace Hopper"
        grantedByLabel="Ada Lovelace"
        revokedByLabel=""
        onRevoke={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/Ada Lovelace/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Grace Hopper/)).toBeInTheDocument();
    expect(screen.getByText(/as Producer/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
    expect(screen.queryByText("active")).not.toBeInTheDocument();
  });

  it("shows a past-expires_at delegation as expired, with no Revoke control", () => {
    render(
      <DelegationRow
        delegation={makeDelegation({ expires_at: "2020-01-01T00:00:00Z" })}
        delegatorLabel="Ada Lovelace"
        delegateLabel="Grace Hopper"
        grantedByLabel="Ada Lovelace"
        revokedByLabel=""
        onRevoke={vi.fn()}
      />,
    );
    expect(screen.getByText("expired")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
  });

  it("shows a revoked delegation with who revoked it and when, distinct from expired", () => {
    render(
      <DelegationRow
        delegation={makeDelegation({
          revoked_at: "2026-08-05T00:00:00Z",
          revoked_by: "u-admin",
        })}
        delegatorLabel="Ada Lovelace"
        delegateLabel="Grace Hopper"
        grantedByLabel="Ada Lovelace"
        revokedByLabel="Site Administrator"
        onRevoke={vi.fn()}
      />,
    );
    expect(screen.getByText("revoked")).toBeInTheDocument();
    expect(screen.getByText(/revoked by Site Administrator/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
  });

  it("renders the owning project's name when given one, for the org-wide screen's own cross-project rows", () => {
    render(
      <DelegationRow
        delegation={makeDelegation()}
        delegatorLabel="Ada Lovelace"
        delegateLabel="Grace Hopper"
        grantedByLabel="Ada Lovelace"
        revokedByLabel=""
        projectLabel="LED Wall Gala"
        onRevoke={vi.fn()}
      />,
    );
    expect(screen.getByText(/LED Wall Gala/)).toBeInTheDocument();
  });
});
