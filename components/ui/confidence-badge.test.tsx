import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";

import { ConfidenceBadge, ManuallyVerifiedBadge } from "./confidence-badge";

describe("ConfidenceBadge", () => {
  it("renders the percentage, rounded", () => {
    render(<ConfidenceBadge value={0.925} />);
    expect(screen.getByText("confidence 93%")).toBeInTheDocument();
  });

  it("uses the warning tone below the 0.7 review threshold", () => {
    render(<ConfidenceBadge value={0.6} />);
    expect(screen.getByText("confidence 60%")).toHaveClass("text-warning");
  });

  it("uses the quiet tone at or above the 0.7 review threshold", () => {
    render(<ConfidenceBadge value={0.7} />);
    const badge = screen.getByText("confidence 70%");
    expect(badge).not.toHaveClass("text-warning");
    expect(badge).toHaveClass("text-ink-secondary");
  });
});

describe("ManuallyVerifiedBadge", () => {
  it("renders the manually-verified label", () => {
    render(<ManuallyVerifiedBadge />);
    expect(screen.getByText("manually verified")).toBeInTheDocument();
  });
});
