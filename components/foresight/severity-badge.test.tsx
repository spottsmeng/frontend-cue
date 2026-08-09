import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SeverityBadge } from "./severity-badge";

// DESIGN.md's severity mapping is a judgment call this milestone actually
// makes — each of the four real RiskSeverityLiteral values gets its own
// assertion so a future change that silently collapses two steps into one
// color fails on a named test, same discipline verification-badge.test.tsx
// already applies to its own four-plus-one states.
describe("SeverityBadge", () => {
  it("renders low as the quietest step, distinct from medium's warning hue", () => {
    render(<SeverityBadge severity="low" />);
    const badge = screen.getByText("Low");
    expect(badge).toHaveClass("text-ink-secondary");
    expect(badge).not.toHaveClass("text-warning");
  });

  it("renders medium with the warning hue", () => {
    render(<SeverityBadge severity="medium" />);
    expect(screen.getByText("Medium")).toHaveClass("text-warning");
  });

  it("renders high with the serious hue", () => {
    render(<SeverityBadge severity="high" />);
    expect(screen.getByText("High")).toHaveClass("text-serious");
  });

  it("renders critical with the critical hue", () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText("Critical")).toHaveClass("text-critical");
  });
});
