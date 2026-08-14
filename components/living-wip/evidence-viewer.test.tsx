import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";
import type { EvidenceOut } from "@/lib/api/types";

import { EvidenceViewer } from "./evidence-viewer";

const evidence: EvidenceOut = {
  id: "ev-1",
  channel: "whatsapp",
  sent_at: "2026-08-09T09:42:00Z",
  language: "zh-Hans",
  original_text: "确认了,总共18500新元",
  translation: "Confirmed — total SGD 18,500",
  span_start: 0,
  span_end: 10,
  media_ref: null,
};

// P7 ("the original language is never lost") — every evidence span needs
// a toggle, not a translate-and-discard; this is the one behaviour test
// this milestone's own TESTING EXPECTATION names explicitly.
describe("EvidenceViewer", () => {
  it("shows the original text by default, tagged with the source language", () => {
    render(<EvidenceViewer evidence={[evidence]} />);
    const text = screen.getByText(evidence.original_text);
    expect(text).toHaveAttribute("lang", "zh-Hans");
    expect(screen.queryByText(evidence.translation!)).not.toBeInTheDocument();
  });

  it("toggles to the English translation on click, without discarding the original", async () => {
    const user = userEvent.setup();
    render(<EvidenceViewer evidence={[evidence]} />);

    await user.click(screen.getByRole("button", { name: "Translation" }));

    const translated = screen.getByText(evidence.translation!);
    expect(translated).toHaveAttribute("lang", "en");
    expect(screen.queryByText(evidence.original_text)).not.toBeInTheDocument();

    // Toggling back proves the original was never discarded, just hidden.
    await user.click(screen.getByRole("button", { name: "Original" }));
    expect(screen.getByText(evidence.original_text)).toBeInTheDocument();
  });

  it("omits the toggle entirely when there is no translation", () => {
    render(<EvidenceViewer evidence={[{ ...evidence, translation: null }]} />);
    expect(screen.queryByRole("button", { name: "Translation" })).not.toBeInTheDocument();
  });

  it("renders an audio player only when media_ref is present", () => {
    const { rerender } = render(<EvidenceViewer evidence={[evidence]} />);
    expect(document.querySelector("audio")).not.toBeInTheDocument();

    rerender(<EvidenceViewer evidence={[{ ...evidence, media_ref: "https://storage.test/voice.ogg" }]} />);
    const audio = document.querySelector("audio");
    expect(audio).toHaveAttribute("src", "https://storage.test/voice.ogg");
  });

  it("shows a status message, not a blank list, when there is no evidence", () => {
    render(<EvidenceViewer evidence={[]} />);
    expect(screen.getByText("No evidence recorded.")).toBeInTheDocument();
  });
});
