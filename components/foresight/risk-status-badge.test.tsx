import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";

import { RiskStatusBadge } from "./risk-status-badge";

// All four real RiskStatusLiteral values get their own assertion — this
// milestone's own NON-OBVIOUS note is explicit that resolved/superseded
// must never collapse into one "closed" look, so that pair gets an extra
// assertion confirming they render with different hues, not just different
// text.
describe("RiskStatusBadge", () => {
  it("renders open as a quiet, neutral pill", () => {
    render(<RiskStatusBadge status="open" />);
    expect(screen.getByText("Open")).toHaveClass("text-ink-secondary");
  });

  it("renders acknowledged with the signal hue", () => {
    render(<RiskStatusBadge status="acknowledged" />);
    expect(screen.getByText("Acknowledged")).toHaveClass("text-signal");
  });

  it("renders resolved with the dusk hue", () => {
    render(<RiskStatusBadge status="resolved" />);
    expect(screen.getByText("Resolved")).toHaveClass("text-dusk");
  });

  it("renders superseded distinctly from resolved, not as the same 'closed' look", () => {
    render(<RiskStatusBadge status="superseded" />);
    const badge = screen.getByText("Superseded");
    expect(badge).toHaveClass("text-ink-muted");
    expect(badge).not.toHaveClass("text-dusk");
  });
});
