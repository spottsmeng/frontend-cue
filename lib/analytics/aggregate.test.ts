import { describe, expect, it } from "vitest";

import {
  bucketVerificationBurdenByWeek,
  computeWritebackReplyRate,
  isoWeekStart,
  type VerificationBurdenCommitment,
  type WritebackReplyMessage,
} from "./aggregate";

const projectsById = new Map([
  ["project-1", "Museum Rewire"],
  ["project-2", "Concert Hall Fit-out"],
]);

function commitment(overrides: VerificationBurdenCommitment): VerificationBurdenCommitment {
  return overrides;
}

function message(overrides: WritebackReplyMessage): WritebackReplyMessage {
  return overrides;
}

describe("isoWeekStart", () => {
  it("returns the same Monday for any weekday in that week", () => {
    // 2026-08-10 is a Monday, 2026-08-16 is the following Sunday.
    expect(isoWeekStart("2026-08-10T00:00:00Z")).toBe("2026-08-10");
    expect(isoWeekStart("2026-08-12T23:59:59Z")).toBe("2026-08-10");
    expect(isoWeekStart("2026-08-16T23:59:59Z")).toBe("2026-08-10");
  });

  it("rolls a Sunday-vs-Monday boundary into different weeks", () => {
    // 2026-08-16 (Sun) belongs to the week starting 2026-08-10; the very
    // next instant, 2026-08-17 (Mon), starts a new week.
    expect(isoWeekStart("2026-08-16T23:59:59Z")).toBe("2026-08-10");
    expect(isoWeekStart("2026-08-17T00:00:00Z")).toBe("2026-08-17");
  });

  it("handles a week that crosses a month boundary", () => {
    expect(isoWeekStart("2026-08-31T12:00:00Z")).toBe("2026-08-31");
    expect(isoWeekStart("2026-09-01T00:00:00Z")).toBe("2026-08-31");
  });
});

describe("bucketVerificationBurdenByWeek", () => {
  it("counts a commitment in the week it was created, keyed by project", () => {
    const commitments = [
      commitment({
        project_id: "project-1",
        verification_state: "pending_verification",
        created_at: "2026-08-11T09:00:00Z",
      }),
      commitment({
        project_id: "project-1",
        verification_state: "human_verified",
        created_at: "2026-08-12T09:00:00Z",
      }),
      commitment({
        project_id: "project-2",
        verification_state: "human_corrected",
        created_at: "2026-08-11T09:00:00Z",
      }),
    ];

    const { series, rows } = bucketVerificationBurdenByWeek(commitments, projectsById);

    expect(series).toEqual([
      {
        projectId: "project-2",
        projectName: "Concert Hall Fit-out",
        points: [{ weekStart: "2026-08-10", value: 1 }],
      },
      {
        projectId: "project-1",
        projectName: "Museum Rewire",
        points: [{ weekStart: "2026-08-10", value: 2 }],
      },
    ]);
    expect(rows).toHaveLength(2);
  });

  it("excludes auto-extracted commitments — they never required a human", () => {
    const commitments = [
      commitment({
        project_id: "project-1",
        verification_state: "auto",
        created_at: "2026-08-11T09:00:00Z",
      }),
    ];
    const { series, rows } = bucketVerificationBurdenByWeek(commitments, projectsById);
    expect(series).toEqual([]);
    expect(rows).toEqual([]);
  });

  it("splits counts across two different weeks for the same project", () => {
    const commitments = [
      commitment({
        project_id: "project-1",
        verification_state: "pending_verification",
        created_at: "2026-08-11T09:00:00Z",
      }),
      commitment({
        project_id: "project-1",
        verification_state: "pending_verification",
        created_at: "2026-08-18T09:00:00Z",
      }),
    ];
    const { series } = bucketVerificationBurdenByWeek(commitments, projectsById);
    expect(series[0].points).toEqual([
      { weekStart: "2026-08-10", value: 1 },
      { weekStart: "2026-08-17", value: 1 },
    ]);
  });

  it("falls back to a placeholder name for a project id missing from the map", () => {
    const commitments = [
      commitment({
        project_id: "unknown-project",
        verification_state: "human_verified",
        created_at: "2026-08-11T09:00:00Z",
      }),
    ];
    const { series } = bucketVerificationBurdenByWeek(commitments, projectsById);
    expect(series[0].projectName).toBe("Unknown project");
  });

  it("returns empty series and rows for empty input", () => {
    expect(bucketVerificationBurdenByWeek([], projectsById)).toEqual({ series: [], rows: [] });
  });
});

describe("computeWritebackReplyRate", () => {
  it("computes sent/replied/rate per project per week", () => {
    const messages = [
      message({
        project_id: "project-1",
        status: "sent",
        reply_outcome: "transitioned",
        created_at: "2026-08-11T09:00:00Z",
      }),
      message({
        project_id: "project-1",
        status: "sent",
        reply_outcome: null,
        created_at: "2026-08-11T10:00:00Z",
      }),
    ];
    const { series, rows } = computeWritebackReplyRate(messages, projectsById);
    expect(rows).toEqual([
      {
        weekStart: "2026-08-10",
        projectId: "project-1",
        projectName: "Museum Rewire",
        sent: 2,
        replied: 1,
        rate: 50,
      },
    ]);
    expect(series[0].points).toEqual([{ weekStart: "2026-08-10", value: 50 }]);
  });

  it("counts an escalated reply as a real reply, same as a transitioned one", () => {
    const messages = [
      message({
        project_id: "project-1",
        status: "sent",
        reply_outcome: "escalated",
        created_at: "2026-08-11T09:00:00Z",
      }),
    ];
    const { rows } = computeWritebackReplyRate(messages, projectsById);
    expect(rows[0]).toMatchObject({ sent: 1, replied: 1, rate: 100 });
  });

  it("ignores drafts and authorised-but-unsent messages — only 'sent' counts", () => {
    const messages = [
      message({
        project_id: "project-1",
        status: "draft",
        reply_outcome: null,
        created_at: "2026-08-11T09:00:00Z",
      }),
      message({
        project_id: "project-1",
        status: "authorised",
        reply_outcome: null,
        created_at: "2026-08-11T09:00:00Z",
      }),
    ];
    const { series, rows } = computeWritebackReplyRate(messages, projectsById);
    expect(series).toEqual([]);
    expect(rows).toEqual([]);
  });

  it("never fabricates a 0% row for a week with no sent messages", () => {
    const messages = [
      message({
        project_id: "project-1",
        status: "sent",
        reply_outcome: "transitioned",
        created_at: "2026-08-11T09:00:00Z",
      }),
    ];
    const { rows } = computeWritebackReplyRate(messages, projectsById);
    // Only one week appears at all — no zero-filled row for e.g. the
    // following week, which never had any traffic.
    expect(rows.map((r) => r.weekStart)).toEqual(["2026-08-10"]);
  });

  it("returns empty series and rows for empty input", () => {
    expect(computeWritebackReplyRate([], projectsById)).toEqual({ series: [], rows: [] });
  });
});
