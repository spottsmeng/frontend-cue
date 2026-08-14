"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { useResolveDocumentVersionQuery } from "@/lib/ask/hooks";
import { routeCitation } from "@/lib/ask/citation-routing";
import type { Citation } from "@/lib/api/types";

/**
 * §12.5: "every citation opens the source" — one real, clickable chip per
 * `Citation`, routed via `routeCitation` to whichever existing detail view
 * owns that source type. `document_version` needs an async resolve (only
 * the version id is on the wire) — rendered as its own small loading state
 * rather than blocking the whole answer on it.
 */
export function CitationChip({
  projectId,
  citation,
  onOpenCommitment,
}: {
  projectId: string;
  citation: Citation;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const t = useTranslations("ask.citations");
  const route = routeCitation(projectId, citation);
  const label = citation.label ?? t(`sourceLabel.${citation.source_type}`);

  if (route.kind === "commitment") {
    return (
      <button
        type="button"
        onClick={() => onOpenCommitment(route.commitmentId)}
        title={citation.snippet ?? undefined}
        className="inline-flex items-center gap-1 rounded-full border border-signal bg-signal-soft px-2 py-0.5 text-xs text-signal hover:opacity-80"
      >
        {t("open", { label })}
      </button>
    );
  }

  if (route.kind === "link") {
    return (
      <Link
        href={route.href}
        title={citation.snippet ?? undefined}
        className="inline-flex items-center gap-1 rounded-full border border-signal bg-signal-soft px-2 py-0.5 text-xs text-signal hover:opacity-80"
      >
        {t("open", { label })}
      </Link>
    );
  }

  if (route.kind === "resolve-document-version") {
    return <DocumentVersionCitationChip projectId={projectId} versionId={route.versionId} label={label} snippet={citation.snippet} />;
  }

  return (
    <span
      title={route.reason}
      className="inline-flex items-center gap-1 rounded-full border border-border-strong px-2 py-0.5 text-xs text-ink-muted"
    >
      {t("notYetAvailable", { label })}
    </span>
  );
}

function DocumentVersionCitationChip({
  projectId,
  versionId,
  label,
  snippet,
}: {
  projectId: string;
  versionId: string;
  label: string;
  snippet?: string | null;
}) {
  const t = useTranslations("ask.citations");
  const { data: version, isLoading, isError } = useResolveDocumentVersionQuery(projectId, versionId);

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border-strong px-2 py-0.5 text-xs text-ink-muted">
        {t("resolving", { label })}
      </span>
    );
  }
  if (isError || !version) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border-strong px-2 py-0.5 text-xs text-ink-muted">
        {t("unresolvable", { label })}
      </span>
    );
  }

  return (
    <Link
      href={`/projects/${projectId}/documents/${version.document_id}`}
      title={snippet ?? undefined}
      className="inline-flex items-center gap-1 rounded-full border border-signal bg-signal-soft px-2 py-0.5 text-xs text-signal hover:opacity-80"
    >
      {t("versionOpen", { label, versionNo: version.version_no })}
    </Link>
  );
}
