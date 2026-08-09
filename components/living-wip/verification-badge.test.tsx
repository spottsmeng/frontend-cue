import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VerificationBadge } from "./verification-badge";

// DESIGN.md: "verification_state has five real values... design the
// badge/colour treatment for all five up front" — each of the five gets
// its own assertion rather than a loop, so a future change that silently
// drops one of them fails on a named test, not a generic count check.
describe("VerificationBadge", () => {
  it("renders the auto state as a quiet, muted pill", () => {
    render(<VerificationBadge state="auto" />);
    const badge = screen.getByText("Auto");
    expect(badge).toHaveClass("text-verify-auto");
  });

  it("renders pending_verification with the warning-borrowed hue", () => {
    render(<VerificationBadge state="pending_verification" />);
    const badge = screen.getByText("Pending verification");
    expect(badge).toHaveClass("text-verify-pending");
  });

  it("renders human_verified with the signal-borrowed hue", () => {
    render(<VerificationBadge state="human_verified" />);
    const badge = screen.getByText("Verified");
    expect(badge).toHaveClass("text-verify-verified");
  });

  it("renders human_corrected with the dusk-borrowed hue", () => {
    render(<VerificationBadge state="human_corrected" />);
    const badge = screen.getByText("Corrected");
    expect(badge).toHaveClass("text-verify-corrected");
  });

  it("renders not_applicable as a plain dash, not a pill", () => {
    render(<VerificationBadge state="not_applicable" />);
    const dash = screen.getByText("—");
    // No pill background/rounding class — a genuinely different shape,
    // not just a fifth colour, per DESIGN.md's own pills-vs-nothing split.
    expect(dash).not.toHaveClass("rounded-full");
  });
});
