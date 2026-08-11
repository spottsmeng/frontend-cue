// Pure aggregation logic for the analytics dashboard (F8, PRD §13). No
// backend endpoint buckets commitments/write-back by week or fans them out
// across projects — see frontend/PROGRESS.md's F8 notes — so this is real,
// tested arithmetic over already-fetched rows, not a display-only helper.

export interface ProjectSeriesPoint {
  weekStart: string; // ISO date (UTC Monday) of the bucket
  value: number;
}

export interface ProjectSeries {
  projectId: string;
  projectName: string;
  points: ProjectSeriesPoint[];
}

/** Monday-start ISO week key (UTC) for a timestamp, e.g. "2026-08-10". */
export function isoWeekStart(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay(); // Sun=0 .. Sat=6
  const diffToMonday = (day + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday),
  );
  return monday.toISOString().slice(0, 10);
}

export interface VerificationBurdenCommitment {
  project_id: string;
  verification_state: string;
  created_at: string;
}

export interface VerificationBurdenRow {
  weekStart: string;
  projectId: string;
  projectName: string;
  count: number;
}

export interface VerificationBurdenResult {
  series: ProjectSeries[];
  rows: VerificationBurdenRow[];
}

/**
 * "Fields requiring human verification per project per week" (PRD §13) —
 * counts, per project per ISO week, commitments whose verification_state is
 * not "auto" (i.e. ever needed a human to look at them), bucketed by the
 * week they were created. This is an arrival count, not a live queue-depth
 * snapshot — a commitment counts in the week it entered the system,
 * regardless of when (or whether) it was later verified.
 */
export function bucketVerificationBurdenByWeek(
  commitments: VerificationBurdenCommitment[],
  projectsById: Map<string, string>,
): VerificationBurdenResult {
  const counts = new Map<string, Map<string, number>>();
  for (const c of commitments) {
    if (c.verification_state === "auto") continue;
    const week = isoWeekStart(c.created_at);
    const byWeek = counts.get(c.project_id) ?? new Map<string, number>();
    byWeek.set(week, (byWeek.get(week) ?? 0) + 1);
    counts.set(c.project_id, byWeek);
  }

  const series: ProjectSeries[] = [];
  const rows: VerificationBurdenRow[] = [];
  for (const [projectId, byWeek] of counts) {
    const projectName = projectsById.get(projectId) ?? "Unknown project";
    const points = [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, value]) => ({ weekStart, value }));
    series.push({ projectId, projectName, points });
    for (const point of points) {
      rows.push({ weekStart: point.weekStart, projectId, projectName, count: point.value });
    }
  }
  series.sort((a, b) => a.projectName.localeCompare(b.projectName));
  rows.sort(
    (a, b) => a.weekStart.localeCompare(b.weekStart) || a.projectName.localeCompare(b.projectName),
  );
  return { series, rows };
}

export interface WritebackReplyMessage {
  project_id: string;
  status: string;
  reply_outcome: string | null;
  created_at: string;
}

export interface ReplyRateRow {
  weekStart: string;
  projectId: string;
  projectName: string;
  sent: number;
  replied: number;
  rate: number; // percentage 0-100; only rows with sent > 0 ever exist
}

export interface ReplyRateResult {
  series: ProjectSeries[]; // value = rate percentage
  rows: ReplyRateRow[];
}

/**
 * "Vendor confirmations received vs. sent" (PRD §13) — per project per ISO
 * week (bucketed by the outbound message's created_at), the share of sent
 * messages that got any reply (reply_outcome set — "transitioned" or
 * "escalated" both count as a reply; only a still-open thread doesn't). A
 * week with zero sent messages simply has no row/point — never a fabricated
 * 0% for a week nothing was sent in.
 */
export function computeWritebackReplyRate(
  messages: WritebackReplyMessage[],
  projectsById: Map<string, string>,
): ReplyRateResult {
  const buckets = new Map<string, Map<string, { sent: number; replied: number }>>();
  for (const m of messages) {
    if (m.status !== "sent") continue;
    const week = isoWeekStart(m.created_at);
    const byWeek = buckets.get(m.project_id) ?? new Map<string, { sent: number; replied: number }>();
    const cur = byWeek.get(week) ?? { sent: 0, replied: 0 };
    cur.sent += 1;
    if (m.reply_outcome !== null) cur.replied += 1;
    byWeek.set(week, cur);
    buckets.set(m.project_id, byWeek);
  }

  const series: ProjectSeries[] = [];
  const rows: ReplyRateRow[] = [];
  for (const [projectId, byWeek] of buckets) {
    const projectName = projectsById.get(projectId) ?? "Unknown project";
    const points: ProjectSeriesPoint[] = [];
    const sortedWeeks = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [weekStart, { sent, replied }] of sortedWeeks) {
      const rate = (replied / sent) * 100;
      rows.push({ weekStart, projectId, projectName, sent, replied, rate });
      points.push({ weekStart, value: rate });
    }
    series.push({ projectId, projectName, points });
  }
  series.sort((a, b) => a.projectName.localeCompare(b.projectName));
  rows.sort(
    (a, b) => a.weekStart.localeCompare(b.weekStart) || a.projectName.localeCompare(b.projectName),
  );
  return { series, rows };
}
