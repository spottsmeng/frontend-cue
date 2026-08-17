import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";
import type { DocumentAuditLogOut } from "@/lib/api/types";

import { ActivityRow } from "./document-activity-log";

function entry(overrides: Partial<DocumentAuditLogOut>): DocumentAuditLogOut {
  return {
    id: "a1",
    project_id: "p1",
    document_id: "d1",
    document_version_id: null,
    action: "document_created",
    actor_id: "u1",
    occurred_at: "2026-08-17T09:00:00Z",
    detail: {},
    ...overrides,
  };
}

// A human-readable view over DocumentAuditLog — previously only visible as
// a raw JSON row inside Admin → Export's whole-project bundle.
describe("ActivityRow", () => {
  it("describes document_created in plain language, with the real actor", () => {
    render(<ActivityRow entry={entry({ action: "document_created" })} actorName="Priya" />);
    expect(screen.getByText("Document created")).toBeInTheDocument();
    expect(screen.getByText(/^Priya ·/)).toBeInTheDocument();
  });

  it("describes version_created with the real version number", () => {
    render(
      <ActivityRow
        entry={entry({ action: "version_created", detail: { version_no: 2 } })}
        actorName="Priya"
      />,
    );
    expect(screen.getByText("New version uploaded (v2)")).toBeInTheDocument();
  });

  it("distinguishes a successful SharePoint sync from a failed one", () => {
    const { rerender } = render(
      <ActivityRow
        entry={entry({ action: "version_approved", detail: { sharepoint_write_back: "ok" } })}
        actorName="Priya"
      />,
    );
    expect(screen.getByText("Version approved and synced to SharePoint")).toBeInTheDocument();

    rerender(
      <ActivityRow
        entry={entry({
          action: "version_approved",
          detail: { sharepoint_write_back: "failed: connection timed out" },
        })}
        actorName="Priya"
      />,
    );
    expect(screen.getByText("Version approved — SharePoint sync failed")).toBeInTheDocument();
  });

  it("describes auto_tagged in plain language", () => {
    render(
      <ActivityRow
        entry={entry({ action: "auto_tagged", detail: { changes: { class_term_id: "led_screen" } } })}
        actorName="Priya"
      />,
    );
    expect(screen.getByText("Classification updated")).toBeInTheDocument();
  });

  it("omits the actor when the action has none recorded", () => {
    render(<ActivityRow entry={entry({ actor_id: null })} actorName="" />);
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});
