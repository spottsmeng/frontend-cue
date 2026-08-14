import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";

import { RefusalMessage } from "./refusal-message";

// This milestone's own NON-OBVIOUS note: the two refusal kinds mean
// genuinely different things and must render distinctly, never the same
// generic "no answer" message — each gets its own assertion so a future
// change that collapses them back together fails a named test.
describe("RefusalMessage", () => {
  it("renders no_citable_source as an honest limitation, not an error", () => {
    render(
      <RefusalMessage
        projectId="proj-1"
        refusalKind="no_citable_source"
        unavailableReason="no source in this project's ledger, documents or communications matches this question"
      />,
    );
    expect(screen.getByText("I don’t have evidence for that")).toBeInTheDocument();
    expect(screen.getByText(/no source in this project's ledger/)).toBeInTheDocument();
    expect(screen.queryByText("CUE can’t do that yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders action_not_yet_supported as a capability gap with a real way to do it directly", () => {
    render(
      <RefusalMessage
        projectId="proj-1"
        refusalKind="action_not_yet_supported"
        unavailableReason="CUE can't chase the vendor yet — outbound actions need Write-back, which hasn't been built."
      />,
    );
    expect(screen.getByText("CUE can’t do that yet")).toBeInTheDocument();
    expect(screen.getByText(/outbound actions need Write-back/)).toBeInTheDocument();
    expect(screen.queryByText("I don’t have evidence for that")).not.toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Open the commitment in Living WIP/ });
    expect(link).toHaveAttribute("href", "/projects/proj-1");
  });

  it("renders the two kinds with visibly different treatment, not the same shell", () => {
    const { container: noSource } = render(
      <RefusalMessage projectId="proj-1" refusalKind="no_citable_source" unavailableReason="x" />,
    );
    const { container: actionGap } = render(
      <RefusalMessage projectId="proj-1" refusalKind="action_not_yet_supported" unavailableReason="y" />,
    );
    const noSourceBox = noSource.firstElementChild!;
    const actionGapBox = actionGap.firstElementChild!;
    expect(noSourceBox.className).not.toBe(actionGapBox.className);
  });
});
