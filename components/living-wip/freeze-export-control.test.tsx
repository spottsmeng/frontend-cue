import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExportBlockedError } from "@/lib/reports/hooks";

import { FreezeExportControl } from "./freeze-export-control";

const { useExportMutation } = vi.hoisted(() => ({ useExportMutation: vi.fn() }));
vi.mock("@/lib/reports/hooks", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/reports/hooks")>();
  return { ...actual, useExportMutation };
});

function baseMutation() {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
  };
}

// FR-RPT-06's 409 is not a generic error — this is the one behaviour
// TESTING EXPECTATION names explicitly: "the export-blocked-409 list
// rendering". `useExportMutation` is mocked (a component test, not an
// integration one — the real 409 round-trip is covered by the Playwright
// spec against the real backend) so the blocking list can be asserted
// directly off a constructed ExportBlockedError.
describe("FreezeExportControl", () => {
  it("renders nothing for a role without export access", () => {
    useExportMutation.mockReturnValue(baseMutation());
    const { container } = render(
      <FreezeExportControl
        projectId="p1"
        effectiveRoles={["designer"]}
        onOpenCommitment={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the blocking commitments list as links into each one's verification flow", () => {
    const blocked = new ExportBlockedError({
      detail: {
        message: "export blocked: monetary fields pending verification (FR-RPT-06)",
        blocking_commitments: [
          { commitment_id: "c-1", deliverable_en: "LED wall rental", reason: "pending_verification" },
          { commitment_id: "c-2", deliverable_en: "Stage rigging", reason: "pending_verification" },
        ],
      },
    });
    useExportMutation.mockReturnValue({ ...baseMutation(), isError: true, error: blocked });

    const onOpenCommitment = vi.fn();
    render(
      <FreezeExportControl
        projectId="p1"
        effectiveRoles={["producer"]}
        onOpenCommitment={onOpenCommitment}
      />,
    );

    expect(screen.getByText(/export blocked/i)).toBeInTheDocument();
    const ledLink = screen.getByRole("button", { name: /LED wall rental/ });
    expect(ledLink).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stage rigging/ })).toBeInTheDocument();

    ledLink.click();
    expect(onOpenCommitment).toHaveBeenCalledWith("c-1");
  });

  it("renders a download link on success, distinct from the live report", () => {
    useExportMutation.mockReturnValue({
      ...baseMutation(),
      isSuccess: true,
      data: { download_url: "https://storage.test/snapshot.pdf" },
    });
    render(
      <FreezeExportControl projectId="p1" effectiveRoles={["administrator"]} onOpenCommitment={vi.fn()} />,
    );
    expect(screen.getByRole("link", { name: /download/i })).toHaveAttribute(
      "href",
      "https://storage.test/snapshot.pdf",
    );
  });
});
