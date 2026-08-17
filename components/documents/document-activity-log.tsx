"use client";

import { useTranslations } from "next-intl";

import { formatDateTime } from "@/lib/format";
import { useDocumentAuditLogQuery } from "@/lib/documents/hooks";
import { resolveMemberLabel, useProjectMembersQuery } from "@/lib/members/hooks";
import type { DocumentAuditLogOut } from "@/lib/api/types";

import { EmptyState } from "../living-wip/empty-state";

/**
 * A human-readable view over `DocumentAuditLog` — previously reachable
 * only as a raw JSON/CSV row inside Admin → Export's whole-project bundle
 * (backend/PROGRESS.md's Blind Spots round, item 3). Most-recent-first,
 * per the endpoint's own docstring; two rows from the same request (a
 * fresh upload's `document_created` immediately followed by
 * `version_created`) can tie on `occurred_at` and aren't guaranteed to
 * render in a particular relative order — a real Postgres `now()`
 * semantics fact, not a bug in this view.
 */
export function DocumentActivityLog({ projectId, documentId }: { projectId: string; documentId: string }) {
  const t = useTranslations("documents.activityLog");
  const { data: entries, isLoading, isError } = useDocumentAuditLogQuery(projectId, documentId);
  const { data: members } = useProjectMembersQuery(projectId);

  if (isLoading) return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (isError) return <p className="text-sm text-critical">{t("loadError")}</p>;
  if (!entries || entries.length === 0) return <EmptyState message={t("empty")} />;

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <ActivityRow key={entry.id} entry={entry} actorName={resolveMemberLabel(members, entry.actor_id ?? "")} />
      ))}
    </ul>
  );
}

/** Exported standalone for document-activity-log.test.tsx. */
export function ActivityRow({ entry, actorName }: { entry: DocumentAuditLogOut; actorName: string }) {
  const t = useTranslations("documents.activityLog");

  return (
    <li className="rounded-md border border-border p-2.5 text-sm">
      <p className="text-ink">{describeAction(entry, t)}</p>
      <p className="mt-1 font-mono text-xs text-ink-muted">
        {entry.actor_id ? t("byOn", { name: actorName, date: formatDateTime(entry.occurred_at) }) : formatDateTime(entry.occurred_at)}
      </p>
    </li>
  );
}

type Translator = ReturnType<typeof useTranslations<"documents.activityLog">>;

/**
 * `DocumentAuditLog.detail` has one fixed, real shape per action (unlike
 * `AuditLog.detail`'s free-form shape across ~6 backend call sites —
 * decision-log-row.tsx's `formatDecisionDetail` handles that harder case) —
 * `record_document_audit_event`'s five call sites in app/documents/
 * service.py are the only source of these rows, so each is translated
 * directly rather than through a generic key:value fallback.
 */
function describeAction(entry: DocumentAuditLogOut, t: Translator): string {
  switch (entry.action) {
    case "document_created":
      return t("documentCreated");
    case "version_created":
      return t("versionCreated", { versionNo: Number(entry.detail.version_no) });
    case "version_approved":
      return entry.detail.sharepoint_write_back === "ok"
        ? t("versionApprovedSynced")
        : t("versionApprovedSyncFailed");
    case "auto_tagged":
      return t("tagged");
    case "project_archived":
      // Never actually reached — this view is scoped to one document's own
      // rows, and project_archived carries document_id=null (a project-
      // wide fact). Kept so this switch stays exhaustive over the real
      // DocumentAuditAction union rather than silently falling through.
      return t("projectArchived");
  }
}
