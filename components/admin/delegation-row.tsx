import { ROLE_LABEL } from "@/lib/admin/constants";
import { formatDateTime } from "@/lib/format";
import type { DelegationOut } from "@/lib/api/types";

/**
 * FR-ADM-03/04's "time-boxed delegation... with scope and expiry shown
 * clearly" — extracted so both the org-wide Delegations screen
 * (`org-delegations-view.tsx`, every project at once) and the per-project
 * Members & Delegations screen (`project-members-view.tsx`, one project's
 * own delegations) render the exact same row, never a second copy that
 * could drift (same `DecisionLogRow`/`RiskLogRow` extraction precedent F5
 * already established). Label resolution (delegator/delegate/granted-by/
 * revoked-by, all raw uuids on `DelegationOut` — Prompt F7's own NON-OBVIOUS
 * note) is the caller's job, since the two screens resolve against
 * different already-fetched sets (org-wide vs. one project); this component
 * only ever renders whatever label string it's given, never a raw id.
 */
export function DelegationRow({
  delegation,
  delegatorLabel,
  delegateLabel,
  grantedByLabel,
  revokedByLabel,
  projectLabel,
  onRevoke,
  revoking = false,
}: {
  delegation: DelegationOut;
  delegatorLabel: string;
  delegateLabel: string;
  grantedByLabel: string;
  revokedByLabel: string;
  projectLabel?: string;
  onRevoke?: () => void;
  revoking?: boolean;
}) {
  const expired = new Date(delegation.expires_at).getTime() <= new Date().getTime();
  const status = delegation.revoked_at ? "revoked" : expired ? "expired" : "active";

  return (
    <li className="rounded-md border border-border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-ink">
          {delegatorLabel} → {delegateLabel}{" "}
          <span className="text-ink-muted">as {ROLE_LABEL[delegation.role]}</span>
        </span>
        {status === "active" && onRevoke ? (
          <button
            type="button"
            disabled={revoking}
            onClick={onRevoke}
            className="rounded-md border border-border-strong px-2 py-1 text-xs text-critical hover:border-critical disabled:opacity-50"
          >
            Revoke
          </button>
        ) : (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              status === "active"
                ? "bg-signal-soft text-signal"
                : status === "expired"
                  ? "bg-surface-sunk text-ink-muted"
                  : "bg-critical-soft text-critical"
            }`}
          >
            {status}
          </span>
        )}
      </div>
      <p className="mt-1 font-mono text-xs text-ink-muted">
        {projectLabel && <>{projectLabel} · </>}
        granted by {grantedByLabel} on {formatDateTime(delegation.granted_at)} · expires{" "}
        {formatDateTime(delegation.expires_at)}
        {delegation.revoked_at && (
          <> · revoked by {revokedByLabel} on {formatDateTime(delegation.revoked_at)}</>
        )}
      </p>
    </li>
  );
}
