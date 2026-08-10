import Link from "next/link";

import type { AskRefusalKind } from "@/lib/api/types";

/**
 * FR-ASK-02/06: the two refusal kinds mean genuinely different things and
 * must read differently, per this milestone's own NON-OBVIOUS note —
 * `no_citable_source` is an honest limitation ("I don't have evidence for
 * that"), `action_not_yet_supported` is a capability gap with a real,
 * existing way to do the thing directly (F1's own write-back flow, per
 * commitment). Neither is styled as a generic error — `available=False` is
 * a normal, expected shape of this API (app/ask/schema.py's own Pydantic-
 * enforced invariant), not a failure.
 */
export function RefusalMessage({
  projectId,
  refusalKind,
  unavailableReason,
}: {
  projectId: string;
  refusalKind: AskRefusalKind;
  unavailableReason: string | null;
}) {
  if (refusalKind === "action_not_yet_supported") {
    return (
      <div className="rounded-md border border-dusk bg-dusk-soft p-3 text-sm text-ink">
        <p className="font-medium text-dusk">CUE can&rsquo;t do that yet</p>
        <p className="mt-1 text-ink-secondary">{unavailableReason}</p>
        <Link href={`/projects/${projectId}`} className="mt-2 inline-block text-signal hover:underline">
          Open the commitment in Living WIP to do it directly →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface-sunk p-3 text-sm text-ink">
      <p className="font-medium text-ink-secondary">I don&rsquo;t have evidence for that</p>
      <p className="mt-1 text-ink-muted">{unavailableReason}</p>
    </div>
  );
}
