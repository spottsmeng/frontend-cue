import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { NotificationOut } from "@/lib/api/types";

import { NotificationRow } from "./notification-list";

function notification(overrides: Partial<NotificationOut>): NotificationOut {
  return {
    id: "n1",
    project_id: "p1",
    recipient_id: "u1",
    risk_id: "r1",
    deviation_id: null,
    commitment_id: null,
    collapsed_risk_ids: [],
    collapsed_count: 1,
    severity: "high",
    downstream_consequence: "Vendor silence risks missing the load-in slot.",
    deliverable_at: "2026-08-10T00:00:00Z",
    delivered_via: null,
    sent_at: null,
    acknowledged_by: null,
    acknowledged_at: null,
    created_at: "2026-08-10T00:00:00Z",
    detail: {},
    ...overrides,
  };
}

// FR-NTF-03: collapsed findings render as one "N related findings" line,
// never N separate rows — this milestone's own TESTING EXPECTATION names
// this explicitly.
describe("NotificationRow", () => {
  it("shows no 'related findings' line for a single, uncollapsed notification", () => {
    render(<NotificationRow notification={notification({ collapsed_count: 1 })} onAcknowledge={vi.fn()} isAcknowledging={false} />);
    expect(screen.queryByText(/related findings/)).not.toBeInTheDocument();
  });

  it("collapses multiple findings into one 'N related findings' line", () => {
    render(<NotificationRow notification={notification({ collapsed_count: 4 })} onAcknowledge={vi.fn()} isAcknowledging={false} />);
    expect(screen.getByText("4 related findings")).toBeInTheDocument();
  });

  it("leads with downstream_consequence, per P3", () => {
    render(<NotificationRow notification={notification({})} onAcknowledge={vi.fn()} isAcknowledging={false} />);
    expect(screen.getByText("Vendor silence risks missing the load-in slot.")).toBeInTheDocument();
  });

  it("renders an already-acknowledged notification without an acknowledge button", () => {
    render(
      <NotificationRow
        notification={notification({ acknowledged_at: "2026-08-10T01:00:00Z" })}
        onAcknowledge={vi.fn()}
        isAcknowledging={false}
      />,
    );
    expect(screen.queryByRole("button", { name: "Acknowledge" })).not.toBeInTheDocument();
  });

  it("never implies push/email/Teams delivery — only webhook, or 'not yet delivered'", () => {
    render(<NotificationRow notification={notification({ delivered_via: null })} onAcknowledge={vi.fn()} isAcknowledging={false} />);
    expect(screen.getByText(/not yet delivered/)).toBeInTheDocument();
  });
});
