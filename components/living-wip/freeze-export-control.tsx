"use client";

import type { MembershipRole } from "@/lib/api/types";
import { ADMIN_ROLES, hasAnyRole } from "@/lib/roles";
import { ExportBlockedError, useExportMutation } from "@/lib/reports/hooks";

/**
 * §12.2's own wording: "Freeze & Export — single control producing PPTX or
 * PDF; creates an immutable snapshot." Administrator/Producer-gated
 * (app/api/reports.py's own ADMIN_ROLES tier). A 409 is not a generic
 * error — its body names exactly which commitments are blocking, rendered
 * here as actionable links straight into each one's verification flow
 * rather than a toast someone has to go hunting from.
 */
export function FreezeExportControl({
  projectId,
  effectiveRoles,
  onOpenCommitment,
}: {
  projectId: string;
  effectiveRoles: MembershipRole[] | undefined;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const exportMutation = useExportMutation(projectId);

  if (!hasAnyRole(effectiveRoles, ADMIN_ROLES)) return null;

  const blocked =
    exportMutation.isError && exportMutation.error instanceof ExportBlockedError
      ? exportMutation.error
      : null;

  return (
    <div className="relative">
      <div className="flex overflow-hidden rounded-md border border-signal">
        <button
          type="button"
          disabled={exportMutation.isPending}
          onClick={() => exportMutation.mutate("pptx")}
          className="bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Freeze &amp; Export PPTX
        </button>
        <button
          type="button"
          disabled={exportMutation.isPending}
          onClick={() => exportMutation.mutate("pdf")}
          className="border-l border-white/30 bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          PDF
        </button>
      </div>

      {exportMutation.isSuccess && (
        <div className="absolute right-0 top-9 z-20 w-72 rounded-lg border border-border bg-surface p-3 text-xs shadow-pop">
          <p className="text-ink">
            Export ready — this snapshot is a point-in-time artefact, distinct from the live
            report above.
          </p>
          <a
            href={exportMutation.data?.download_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-signal hover:underline"
          >
            Download →
          </a>
        </div>
      )}

      {blocked && (
        <div className="absolute right-0 top-9 z-20 w-80 rounded-lg border border-critical bg-surface p-3 text-xs shadow-pop">
          <p className="text-critical">{blocked.message}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {blocked.blockingCommitments.map((c) => (
              <li key={c.commitment_id}>
                <button
                  type="button"
                  onClick={() => onOpenCommitment(c.commitment_id)}
                  className="text-left text-signal hover:underline"
                >
                  {c.deliverable_en} →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
