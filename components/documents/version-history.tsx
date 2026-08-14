"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("documents.versionHistory");
  const { data: members } = useProjectMembersQuery(projectId);
  const approveMutation = useApproveVersionMutation(projectId);
  const [expandedClaims, setExpandedClaims] = useState<string | null>(null);
  const canWrite = hasAnyRole(effectiveRoles, WRITE_ROLES);

  if (lineage.versions.length === 0) {
    return <p className="text-sm text-ink-muted">{t("empty")}</p>;
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
                  {t("current")}
                </span>
              ) : (
                <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-xs font-medium text-ink-muted">
                  {t("superseded")}
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
                {t("download")}
              </a>
            )}
          </div>

          <div className="mt-2 text-xs text-ink-muted">
            {v.approved_by ? (
              <span>
                {t("approvedBy", {
                  name: resolveMemberLabel(members, v.approved_by),
                  date: formatDateTime(v.approved_at),
                })}
              </span>
            ) : (
              <span>{t("notApproved")}</span>
            )}
          </div>

          <div className="mt-2">
            {v.extracted_text ? (
              <p className="line-clamp-3 rounded-md bg-surface-sunk p-2 text-xs text-ink-secondary">
                {v.extracted_text}
              </p>
            ) : (
              <p className="rounded-md bg-warning-soft p-2 text-xs text-warning">
                {t("notIndexed")}
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
                {approveMutation.isPending ? t("approving") : t("approve")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpandedClaims(expandedClaims === v.id ? null : v.id)}
              className="text-xs text-ink-muted hover:text-signal"
            >
              {expandedClaims === v.id ? t("hideSpecClaims") : t("viewSpecClaims")}
            </button>
          </div>

          {approveMutation.isError && approveMutation.variables?.versionId === v.id && (
            <p className="mt-1.5 text-xs text-critical">{t("approveError")}</p>
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
