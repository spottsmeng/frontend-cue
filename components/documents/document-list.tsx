"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { formatDateTime } from "@/lib/format";
import { resolveTermLabel, useDocumentsQuery } from "@/lib/documents/hooks";
import type { OntologyTermOut } from "@/lib/api/types";

/**
 * `GET .../documents` has no server-side filter query params (unlike
 * `GET .../risks`'s status/source/severity) — filtering by class is done
 * client-side over the fetched list, documented in frontend/PROGRESS.md's
 * F4 notes rather than presented as a server-side filter it isn't.
 */
export function DocumentList({
  projectId,
  classTerms,
  classTermFilter,
}: {
  projectId: string;
  classTerms: OntologyTermOut[] | undefined;
  classTermFilter: string | null;
}) {
  const t = useTranslations("documents.list");
  const { data: documents, isLoading, isError } = useDocumentsQuery(projectId);

  if (isLoading) return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (isError) return <p className="text-sm text-critical">{t("loadError")}</p>;
  if (!documents || documents.length === 0) {
    return <p className="text-sm text-ink-muted">{t("empty")}</p>;
  }

  const filtered = classTermFilter
    ? documents.filter((d) => d.class_term_id === classTermFilter)
    : documents;

  if (filtered.length === 0) {
    return <p className="text-sm text-ink-muted">{t("noMatch")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {filtered.map((doc) => {
        const classTerm = doc.class_term_id ? resolveTermLabel(classTerms, doc.class_term_id) : null;
        return (
          <li key={doc.id} className="rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/projects/${projectId}/documents/${doc.id}`}
                className="text-sm font-medium text-ink hover:text-signal hover:underline"
              >
                {doc.name}
              </Link>
              {doc.current_version_id === null && (
                <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-xs font-medium text-ink-muted">
                  {t("noVersionYet")}
                </span>
              )}
            </div>
            <p className="mt-1.5 flex flex-wrap gap-2 font-mono text-xs text-ink-muted">
              {classTerm ? (
                <span className="rounded-full bg-dusk-soft px-2 py-0.5 text-dusk">
                  {classTerm.label_en}
                </span>
              ) : (
                <span>{t("untagged")}</span>
              )}
              <span>{t("updated", { date: formatDateTime(doc.updated_at) })}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
