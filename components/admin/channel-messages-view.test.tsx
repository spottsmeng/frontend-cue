import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";
import type { MessageOut } from "@/lib/api/types";

import { MessageRow } from "./channel-messages-view";

function message(overrides: Partial<MessageOut>): MessageOut {
  return {
    id: "m1",
    channel_id: "c1",
    external_id: "wa-1",
    sender_external_id: "+6591234567",
    author_party_id: "p1",
    identity_confidence: 1.0,
    identity_manually_verified: false,
    sent_at: "2026-08-10T09:00:00Z",
    language: "en",
    text: "Confirming delivery Friday.",
    extraction_attempted_at: null,
    ...overrides,
  };
}

// Blind Spots item 6: Message.identity_confidence / identity_manually_verified
// — set by resolve_identity at capture time, never surfaced on this debug
// console until now.
describe("MessageRow", () => {
  it("shows the resolved-identity confidence", () => {
    render(<MessageRow message={message({ identity_confidence: 0.6 })} />);
    expect(screen.getByText("confidence 60%")).toBeInTheDocument();
  });

  it("shows a manually-verified badge only when the identity was corrected by a human", () => {
    render(<MessageRow message={message({ identity_manually_verified: true })} />);
    expect(screen.getByText("manually verified")).toBeInTheDocument();
  });

  it("shows no manually-verified badge for an ordinary auto-resolved identity", () => {
    render(<MessageRow message={message({ identity_manually_verified: false })} />);
    expect(screen.queryByText("manually verified")).not.toBeInTheDocument();
  });

  it("shows no confidence badge when identity was never resolved", () => {
    render(<MessageRow message={message({ identity_confidence: null })} />);
    expect(screen.queryByText(/confidence/)).not.toBeInTheDocument();
  });
});
