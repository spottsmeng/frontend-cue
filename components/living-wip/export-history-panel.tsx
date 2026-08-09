"use client";

import { formatDateTime } from "@/lib/format";
import { useSnapshotsQuery } from "@/lib/reports/hooks";

import { EmptyState } from "./empty-state";
import { SectionPanel } from "./section-panel";

/** FR-RPT-08: every export is an immutable snapshot, retrievable forever —
 * `GET .../report/snapshots` is that history, each row its own
 * `download_url` straight from storage. */
export function ExportHistoryPanel({ projectId }: { projectId: string }) {
  const { data: snapshots, isLoading } = useSnapshotsQuery(projectId);

  return (
    <SectionPanel title="Export history">
      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : !snapshots || snapshots.length === 0 ? (
        <EmptyState message="No exports yet — use Freeze & Export above once the report is ready to share." />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {snapshots.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-md border border-border p-2 text-sm"
            >
              <span className="font-mono text-xs text-ink-muted">
                {s.format.toUpperCase()} · {s.trigger} · {formatDateTime(s.generated_at)}
              </span>
              <a
                href={s.download_url}
                target="_blank"
                rel="noreferrer"
                className="text-signal hover:underline"
              >
                Download →
              </a>
            </li>
          ))}
        </ul>
      )}
    </SectionPanel>
  );
}
