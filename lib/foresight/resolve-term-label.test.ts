import { describe, expect, it } from "vitest";

import { resolveTermLabel } from "./hooks";

// backend/PROGRESS.md's "round 3" frontend-enablement notes: OntologyTermOut
// now carries a real `id`, so a *_term_id FK can be resolved to a label —
// this is that resolver, tested directly against hand-built terms rather
// than through a query client.
describe("resolveTermLabel", () => {
  const terms = [
    { id: "t1", code: "spec_drift", label_en: "Spec drift / contradiction" },
    { id: "t2", code: "delay", label_en: "Delay" },
  ];

  it("resolves a known term id to its code and label", () => {
    expect(resolveTermLabel(terms, "t1")).toEqual({
      code: "spec_drift",
      label_en: "Spec drift / contradiction",
    });
  });

  it("returns null for a term id that isn't in the fetched set, never a guess", () => {
    expect(resolveTermLabel(terms, "not-a-real-id")).toBeNull();
  });

  it("returns null when the terms list hasn't loaded yet", () => {
    expect(resolveTermLabel(undefined, "t1")).toBeNull();
  });
});
