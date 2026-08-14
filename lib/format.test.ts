import { describe, expect, it } from "vitest";

import { contentLang } from "./format";
import type { EvidenceOut } from "@/lib/api/types";

function evidence(language: string): EvidenceOut {
  return {
    id: "e1",
    channel: "whatsapp",
    sent_at: "2026-08-01T00:00:00Z",
    language,
    original_text: "text",
    translation: null,
    media_ref: null,
  } as EvidenceOut;
}

describe("contentLang", () => {
  it("resolves from the first evidence item's own bcp47 language", () => {
    expect(contentLang([evidence("zh-Hans")])).toBe("zh-Hans");
    expect(contentLang([evidence("zh-Hant"), evidence("en")])).toBe("zh-Hant");
  });

  it("returns undefined for an empty evidence array", () => {
    expect(contentLang([])).toBeUndefined();
  });

  it("returns undefined for null/undefined evidence", () => {
    expect(contentLang(null)).toBeUndefined();
    expect(contentLang(undefined)).toBeUndefined();
  });
});
