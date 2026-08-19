import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";
import type { DocumentLineageOut } from "@/lib/api/types";

import { VersionHistory } from "./version-history";

const { useApproveVersionMutation, useExtractSpecClaimsMutation } = vi.hoisted(() => ({
  useApproveVersionMutation: vi.fn(),
  useExtractSpecClaimsMutation: vi.fn(),
}));
vi.mock("@/lib/documents/hooks", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/documents/hooks")>();
  return { ...actual, useApproveVersionMutation, useExtractSpecClaimsMutation };
});

const { useProjectMembersQuery } = vi.hoisted(() => ({ useProjectMembersQuery: vi.fn() }));
vi.mock("@/lib/members/hooks", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/members/hooks")>();
  return { ...actual, useProjectMembersQuery };
});

vi.mock("./spec-claims-panel", () => ({ SpecClaimsPanel: () => null }));

function baseMutation() {
  return { mutate: vi.fn(), isPending: false, isError: false, variables: undefined };
}

function makeLineage(overrides: Partial<DocumentLineageOut> = {}): DocumentLineageOut {
  return {
    document_id: "doc-1",
    current_version_id: "v2",
    versions: [
      {
        id: "v1",
        document_id: "doc-1",
        version_no: 1,
        storage_ref: "documents/doc-1/v1/x",
        extracted_text: "Original spec text.",
        approved_by: "user-1",
        approved_at: "2026-08-01T00:00:00Z",
        is_current: false,
        download_url: "https://storage.test/v1",
        created_at: "2026-08-01T00:00:00Z",
        updated_at: "2026-08-01T00:00:00Z",
      },
      {
        id: "v2",
        document_id: "doc-1",
        version_no: 2,
        storage_ref: "documents/doc-1/v2/x",
        extracted_text: null,
        approved_by: null,
        approved_at: null,
        is_current: true,
        download_url: "https://storage.test/v2",
        created_at: "2026-08-02T00:00:00Z",
        updated_at: "2026-08-02T00:00:00Z",
      },
    ],
    ...overrides,
  };
}

/**
 * F4's own TESTING EXPECTATION: "Vitest for the lineage/current-version
 * rendering logic." `is_current` is entirely server-computed
 * (app/documents/models.py's Document.current_version_id — an explicit
 * pointer, never inferred from "highest version_no") — what this
 * component owns is rendering that pointer unambiguously, exactly once,
 * never re-derived client-side.
 */
describe("VersionHistory", () => {
  it("marks exactly the current version, and every other one as superseded", () => {
    useApproveVersionMutation.mockReturnValue(baseMutation());
    useExtractSpecClaimsMutation.mockReturnValue(baseMutation());
    useProjectMembersQuery.mockReturnValue({ data: [{ user_id: "user-1", email: "pm@example.test", display_name: null }] });

    render(
      <VersionHistory
        projectId="p1"
        documentId="doc-1"
        lineage={makeLineage()}
        effectiveRoles={["producer"]}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(screen.getAllByText("Current", { exact: true })).toHaveLength(1);
    expect(screen.getAllByText("Superseded", { exact: true })).toHaveLength(1);

    const v1Row = rows.find((r) => r.textContent?.includes("v1"))!;
    const v2Row = rows.find((r) => r.textContent?.includes("v2"))!;
    expect(v1Row.textContent).toContain("Superseded");
    expect(v2Row.textContent).toContain("Current");
  });

  it("resolves approved_by to a real member label, not a raw user id", () => {
    useApproveVersionMutation.mockReturnValue(baseMutation());
    useExtractSpecClaimsMutation.mockReturnValue(baseMutation());
    useProjectMembersQuery.mockReturnValue({
      data: [{ user_id: "user-1", email: "pm@example.test", display_name: "Priya (PM)" }],
    });

    render(
      <VersionHistory projectId="p1" documentId="doc-1" lineage={makeLineage()} effectiveRoles={["producer"]} />,
    );

    expect(screen.getByText(/Approved by Priya \(PM\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Approved by user-1/)).not.toBeInTheDocument();
  });

  it("flags a version with no extracted_text as not yet indexed, rather than implying it's searchable", () => {
    useApproveVersionMutation.mockReturnValue(baseMutation());
    useExtractSpecClaimsMutation.mockReturnValue(baseMutation());
    useProjectMembersQuery.mockReturnValue({ data: [] });

    render(
      <VersionHistory projectId="p1" documentId="doc-1" lineage={makeLineage()} effectiveRoles={["producer"]} />,
    );

    expect(screen.getByText(/Not yet indexed/)).toBeInTheDocument();
    expect(screen.getByText("Original spec text.")).toBeInTheDocument();
  });

  it("only offers Approve for a not-yet-approved version, and only to a write role", () => {
    useApproveVersionMutation.mockReturnValue(baseMutation());
    useExtractSpecClaimsMutation.mockReturnValue(baseMutation());
    useProjectMembersQuery.mockReturnValue({ data: [] });

    // Separate render()/unmount() per case, not RTL's `rerender` — `render`
    // here is `renderWithIntl`, which wraps `NextIntlClientProvider` around
    // the element itself rather than via RTL's `wrapper` option, so a bare
    // `rerender(...)` would replace the whole tree and drop the provider.
    const first = render(
      <VersionHistory projectId="p1" documentId="doc-1" lineage={makeLineage()} effectiveRoles={["producer"]} />,
    );
    // v1 already approved, v2 isn't — exactly one Approve button, on v2's row.
    const approveButtons = screen.getAllByRole("button", { name: /^Approve/ });
    expect(approveButtons).toHaveLength(1);
    first.unmount();

    render(
      <VersionHistory projectId="p1" documentId="doc-1" lineage={makeLineage()} effectiveRoles={["read_only"]} />,
    );
    expect(screen.queryByRole("button", { name: /^Approve/ })).not.toBeInTheDocument();
  });

  // The gap this round closes: SpecClaimsPanel could only ever render
  // claims that already existed — nothing called the extraction endpoint.
  it("offers Extract spec claims to a write role, and calls the mutation for the right version", () => {
    useApproveVersionMutation.mockReturnValue(baseMutation());
    const extractMutate = vi.fn();
    useExtractSpecClaimsMutation.mockReturnValue({ ...baseMutation(), mutate: extractMutate });
    useProjectMembersQuery.mockReturnValue({ data: [] });

    render(
      <VersionHistory projectId="p1" documentId="doc-1" lineage={makeLineage()} effectiveRoles={["producer"]} />,
    );

    const extractButtons = screen.getAllByRole("button", { name: "Extract spec claims" });
    expect(extractButtons).toHaveLength(2);
    extractButtons[1]!.click();
    expect(extractMutate).toHaveBeenCalledWith(
      { documentId: "doc-1", versionId: "v2" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("hides Extract spec claims from a read-only role", () => {
    useApproveVersionMutation.mockReturnValue(baseMutation());
    useExtractSpecClaimsMutation.mockReturnValue(baseMutation());
    useProjectMembersQuery.mockReturnValue({ data: [] });

    render(
      <VersionHistory projectId="p1" documentId="doc-1" lineage={makeLineage()} effectiveRoles={["read_only"]} />,
    );
    expect(screen.queryByRole("button", { name: "Extract spec claims" })).not.toBeInTheDocument();
  });

  it("shows a real error, not a silent failure, when extraction is rejected", () => {
    useApproveVersionMutation.mockReturnValue(baseMutation());
    useExtractSpecClaimsMutation.mockReturnValue({
      ...baseMutation(),
      isError: true,
      variables: { documentId: "doc-1", versionId: "v2" },
    });
    useProjectMembersQuery.mockReturnValue({ data: [] });

    render(
      <VersionHistory projectId="p1" documentId="doc-1" lineage={makeLineage()} effectiveRoles={["producer"]} />,
    );
    expect(screen.getByText("Could not extract spec claims from this version.")).toBeInTheDocument();
  });
});
