"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/format";
import { useApproveVersionMutation } from "@/lib/documents/hooks";
import { resolveMemberLabel, useProjectMembersQuery } from "@/lib/members/hooks";
import type { DocumentLineageOut, MembershipRole } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";

import { SpecClaimsPanel } from "./spec-claims-panel";

/**
 * FR-DOC-02/04: full lineage in order, current version unambiguously
 * marked (`is_current`/`DocumentLineageOut.current_version_id`) — never
 * inferred from "highest version_no" client-side, mirroring the backend's
 * own explicit-pointer discipline (app/documents/models.py's Document
 * docstring).
 */
export function VersionHistory({
  projectId,
  documentId,
  lineage,
  effectiveRoles,
}: {
  projectId: string;
  documentId: string;
  lineage: DocumentLineageOut;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const { data: members } = useProjectMembersQuery(projectId);
  const approveMutation = useApproveVersionMutation(projectId);
  const [expandedClaims, setExpandedClaims] = useState<string | null>(null);
  const canWrite = hasAnyRole(effectiveRoles, WRITE_ROLES);

  if (lineage.versions.length === 0) {
    return <p className="text-sm text-ink-muted">No versions uploaded yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {lineage.versions.map((v) => (
        <li key={v.id} className="rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-ink">v{v.version_no}</span>
              {v.is_current ? (
                <span className="rounded-full bg-signal-soft px-2 py-0.5 text-xs font-medium text-signal">
                  Current
                </span>
              ) : (
                <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-xs font-medium text-ink-muted">
                  Superseded
                </span>
              )}
            </div>
            {v.download_url && (
              <a
                href={v.download_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-signal hover:underline"
              >
                Download →
              </a>
            )}
          </div>

          <div className="mt-2 text-xs text-ink-muted">
            {v.approved_by ? (
              <span>
                Approved by {resolveMemberLabel(members, v.approved_by)} on{" "}
                {formatDateTime(v.approved_at)}. Write-back to SharePoint/Nextcloud may have run
                in the background &mdash; its outcome isn&rsquo;t surfaced by this build (see
                frontend/PROGRESS.md).
              </span>
            ) : (
              <span>Not yet approved.</span>
            )}
          </div>

          <div className="mt-2">
            {v.extracted_text ? (
              <p className="line-clamp-3 rounded-md bg-surface-sunk p-2 text-xs text-ink-secondary">
                {v.extracted_text}
              </p>
            ) : (
              <p className="rounded-md bg-warning-soft p-2 text-xs text-warning">
                Not yet indexed — no text could be extracted from this file. Re-upload a version
                with extracted text supplied to fix search for this document.
              </p>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {canWrite && !v.approved_by && (
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate({ documentId, versionId: v.id })}
                className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {approveMutation.isPending ? "Approving…" : "Approve — this becomes the approved version"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpandedClaims(expandedClaims === v.id ? null : v.id)}
              className="text-xs text-ink-muted hover:text-signal"
            >
              {expandedClaims === v.id ? "Hide spec claims" : "View spec claims"}
            </button>
          </div>

          {approveMutation.isError && approveMutation.variables?.versionId === v.id && (
            <p className="mt-1.5 text-xs text-critical">Could not approve this version.</p>
          )}

          {expandedClaims === v.id && (
            <div className="mt-2 border-t border-border pt-2">
              <SpecClaimsPanel projectId={projectId} documentId={documentId} versionId={v.id} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
