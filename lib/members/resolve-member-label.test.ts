import { describe, expect, it } from "vitest";

import type { ProjectMemberOut } from "@/lib/api/types";

import { resolveMemberLabel } from "./hooks";

function member(overrides: Partial<ProjectMemberOut>): ProjectMemberOut {
  return {
    user_id: "u1",
    display_name: "Jane PM",
    email: "jane@example.test",
    role: "project_manager",
    ...overrides,
  };
}

// backend/PROGRESS.md's "round 3" notes: GET /projects/{id}/members closes
// the gap that used to force a pasted UUID into DeviationResolveRequest.
// resolution_owner — this resolver is what turns that id back into a
// readable name at render time.
describe("resolveMemberLabel", () => {
  it("prefers display_name when set", () => {
    const members = [member({ user_id: "u1", display_name: "Jane PM" })];
    expect(resolveMemberLabel(members, "u1")).toBe("Jane PM");
  });

  it("falls back to email when display_name is null", () => {
    const members = [member({ user_id: "u1", display_name: null, email: "jane@example.test" })];
    expect(resolveMemberLabel(members, "u1")).toBe("jane@example.test");
  });

  it("falls back to the raw id for a user who isn't a project member, never a guess", () => {
    const members = [member({ user_id: "u1" })];
    expect(resolveMemberLabel(members, "someone-else")).toBe("someone-else");
  });

  it("falls back to the raw id when the members list hasn't loaded yet", () => {
    expect(resolveMemberLabel(undefined, "u1")).toBe("u1");
  });
});
