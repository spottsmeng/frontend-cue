"use client";

import { useRecomputeMutation } from "@/lib/twin/hooks";

/**
 * §11.2's resource table lists `recompute` as its own operation. Every
 * milestone/dependency mutation already triggers server-side Twin
 * recomputation and this session's own mutation hooks already refetch
 * `/twin/current` afterward (lib/twin/hooks.ts's invalidateTwin), so this
 * button is mostly redundant on a routine editing session — kept anyway
 * (not dropped) because it's a distinct, audited, PM-triggered action
 * server-side (app/api/twin.py's twin_recompute docstring: "a manual 'I
 * asked for a fresh look' is worth recording; a routine page load is not"),
 * e.g. after a change made outside the app (an ops fix run directly against
 * the database) that this session's own cache wouldn't otherwise know to
 * refetch.
 */
export function RecomputeButton({ projectId }: { projectId: string }) {
  const recompute = useRecomputeMutation(projectId);
  return (
    <button
      type="button"
      onClick={() => recompute.mutate()}
      disabled={recompute.isPending}
      title="Force a fresh CPM pass and record it in the Twin audit trail"
      className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary hover:border-signal hover:text-signal disabled:opacity-50"
    >
      {recompute.isPending ? "Recomputing…" : "Recompute"}
    </button>
  );
}
