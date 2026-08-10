import { describe, expect, it } from "vitest";

import { routeCitation } from "./citation-routing";
import type { CitationSourceType } from "@/lib/api/types";

// This milestone's own TESTING EXPECTATION: "all six source_type values map
// somewhere sensible" — every value in CitationSourceTypeLiteral
// (app/ask/schema.py), tested against the pure routing function directly
// (no query client, no component render).
describe("routeCitation", () => {
  const projectId = "proj-1";

  it("routes commitment to the existing commitment drawer", () => {
    expect(routeCitation(projectId, { source_type: "commitment", source_id: "c1" })).toEqual({
      kind: "commitment",
      commitmentId: "c1",
    });
  });

  it("routes budget to Living WIP, the surface that owns the budget summary", () => {
    const route = routeCitation(projectId, { source_type: "budget", source_id: "b1" });
    expect(route).toEqual({ kind: "link", href: "/projects/proj-1", label: "View budget in Living WIP" });
  });

  it("routes deviation to Foresight, the surface that owns the deviation list", () => {
    const route = routeCitation(projectId, { source_type: "deviation", source_id: "d1" });
    expect(route).toEqual({ kind: "link", href: "/projects/proj-1/foresight", label: "View in Foresight" });
  });

  it("routes document_version to a resolve step, since only the version id is on the wire", () => {
    expect(routeCitation(projectId, { source_type: "document_version", source_id: "v1" })).toEqual({
      kind: "resolve-document-version",
      versionId: "v1",
    });
  });

  it("marks audit_log unavailable rather than fabricating a link with no actor or commitment_id", () => {
    const route = routeCitation(projectId, { source_type: "audit_log", source_id: "a1" });
    expect(route.kind).toBe("unavailable");
    expect((route as { reason: string }).reason).toMatch(/actor/i);
  });

  it("marks evidence unavailable — it's never the final citation type in practice, but the schema declares it", () => {
    const route = routeCitation(projectId, { source_type: "evidence", source_id: "e1" });
    expect(route.kind).toBe("unavailable");
  });

  it("covers every literal CitationSourceType value, so a future addition to the enum fails this test, not silently falls through", () => {
    const covered: CitationSourceType[] = [
      "commitment",
      "evidence",
      "budget",
      "document_version",
      "audit_log",
      "deviation",
    ];
    for (const sourceType of covered) {
      expect(() => routeCitation(projectId, { source_type: sourceType, source_id: "x" })).not.toThrow();
    }
  });
});
