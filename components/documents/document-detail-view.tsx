"use client";

import Link from "next/link";

import { useEffectiveRoles } from "@/lib/roles";
import { useDocumentLineageQuery, useDocumentQuery } from "@/lib/documents/hooks";

import { SectionPanel } from "../living-wip/section-panel";
import { AddVersionForm } from "./add-version-form";
import { DocumentTagForm } from "./document-tag-form";
import { VersionHistory } from "./version-history";

export function DocumentDetailView({
  projectId,
  documentId,
}: {
  projectId: string;
  documentId: string;
}) {
  const { data: roles } = useEffectiveRoles(projectId);
  const { data: document, isLoading, isError } = useDocumentQuery(projectId, documentId);
  const { data: lineage } = useDocumentLineageQuery(projectId, documentId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur">
        <Link href={`/projects/${projectId}/documents`} className="text-sm text-ink-muted hover:text-signal">
          ← Documents
        </Link>
        <span className="text-sm font-medium text-ink">{document?.name ?? "Document"}</span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
        {isError && <p className="text-sm text-critical">Could not load this document.</p>}

        {document && (
          <SectionPanel title="Tags">
            <DocumentTagForm projectId={projectId} document={document} effectiveRoles={roles?.roles} />
          </SectionPanel>
        )}

        <SectionPanel
          title="Versions"
          action={<AddVersionForm projectId={projectId} documentId={documentId} effectiveRoles={roles?.roles} />}
        >
          {lineage ? (
            <VersionHistory
              projectId={projectId}
              documentId={documentId}
              lineage={lineage}
              effectiveRoles={roles?.roles}
            />
          ) : (
            <p className="text-sm text-ink-muted">Loading version history…</p>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}
