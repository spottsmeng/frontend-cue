import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminPermissionError } from "@/lib/admin/members-hooks";
import type { RetentionPolicyOut } from "@/lib/api/types";

import { RetentionPolicyView } from "./retention-policy-view";

const {
  useRetentionPoliciesQuery,
  useCreateRetentionPolicyMutation,
  useUpdateRetentionPolicyMutation,
  useDeleteRetentionPolicyMutation,
} = vi.hoisted(() => ({
  useRetentionPoliciesQuery: vi.fn(),
  useCreateRetentionPolicyMutation: vi.fn(),
  useUpdateRetentionPolicyMutation: vi.fn(),
  useDeleteRetentionPolicyMutation: vi.fn(),
}));
vi.mock("@/lib/admin/retention-hooks", () => ({
  useRetentionPoliciesQuery,
  useCreateRetentionPolicyMutation,
  useUpdateRetentionPolicyMutation,
  useDeleteRetentionPolicyMutation,
}));

const { useAdminProjectsQuery } = vi.hoisted(() => ({ useAdminProjectsQuery: vi.fn() }));
vi.mock("@/lib/admin/projects-hooks", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/admin/projects-hooks")>();
  return { ...actual, useAdminProjectsQuery };
});

function baseMutation() {
  return { mutate: vi.fn(), isPending: false, isError: false };
}

function makePolicy(overrides: Partial<RetentionPolicyOut> = {}): RetentionPolicyOut {
  return {
    id: "policy-1",
    organisation_id: "org-1",
    vertical_id: null,
    region: null,
    retention_days: 365,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  useCreateRetentionPolicyMutation.mockReturnValue(baseMutation());
  useUpdateRetentionPolicyMutation.mockReturnValue(baseMutation());
  useDeleteRetentionPolicyMutation.mockReturnValue(baseMutation());
  useAdminProjectsQuery.mockReturnValue({ data: [{ id: "p-1", vertical_id: "vert-1" }] });
});

// This milestone's own named TESTING EXPECTATION: "the retention-policy
// narrowing/broadening table rendering" — org x vertical x region -> a
// single retention_days, NULL broadening. A caller must be able to tell a
// broad organisation-wide default apart from a narrower vertical/region
// override at a glance, not just by reading the raw ids.
describe("RetentionPolicyView", () => {
  it("renders an organisation-wide (NULL/NULL) policy as broadening across all verticals and regions", () => {
    useRetentionPoliciesQuery.mockReturnValue({ data: [makePolicy()], isLoading: false, isError: false });
    render(<RetentionPolicyView />);
    const list = within(screen.getByRole("list"));
    expect(list.getByText(/All verticals/)).toBeInTheDocument();
    expect(list.getByText(/all regions/)).toBeInTheDocument();
  });

  it("renders a narrower, region-scoped override distinctly from the org-wide default", () => {
    useRetentionPoliciesQuery.mockReturnValue({
      data: [makePolicy(), makePolicy({ id: "policy-2", region: "SG", retention_days: 90 })],
      isLoading: false,
      isError: false,
    });
    render(<RetentionPolicyView />);
    const list = within(screen.getByRole("list"));
    expect(list.getAllByText(/All verticals/).length).toBeGreaterThan(0);
    expect(list.getByText(/SG/)).toBeInTheDocument();
    // Both retention windows are visible, not collapsed into one row.
    expect(screen.getAllByDisplayValue("365").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("90")).toBeInTheDocument();
  });

  it("renders a vertical-scoped policy's own real vertical id, never a raw uuid label", () => {
    useRetentionPoliciesQuery.mockReturnValue({
      data: [makePolicy({ vertical_id: "vert-1" })],
      isLoading: false,
      isError: false,
    });
    render(<RetentionPolicyView />);
    const list = within(screen.getByRole("list"));
    expect(list.getByText(/This organisation's vertical/)).toBeInTheDocument();
    expect(screen.queryByText("vert-1")).not.toBeInTheDocument();
  });

  it("renders an explainable permission message for a non-administrator, not a generic failure", () => {
    useRetentionPoliciesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new AdminPermissionError("nope"),
    });
    render(<RetentionPolicyView />);
    expect(screen.getByText(/Administrator only/)).toBeInTheDocument();
  });

  it("renders an honest empty state when no policy is configured at all", () => {
    useRetentionPoliciesQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<RetentionPolicyView />);
    expect(screen.getByText(/No retention policy configured/)).toBeInTheDocument();
  });
});
