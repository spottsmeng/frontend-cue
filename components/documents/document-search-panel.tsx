"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useDocumentSearchQuery } from "@/lib/documents/hooks";

/**
 * FR-DOC-05 — lexical only. This milestone's own EXPLICITLY OUT OF SCOPE
 * note: no copy here implies semantic ("documents like this one") matching,
 * since the pgvector `embedding` column is added but never populated for
 * documents this build (F5/Ask populates and queries its own retrieval
 * index separately).
 */
export function DocumentSearchPanel({ projectId }: { projectId: string }) {
  const t = useTranslations("documents.search");
  const [query, setQuery] = useState("");
  const { data: results, isFetching, isError } = useDocumentSearchQuery(projectId, query);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("placeholder")}
        className="w-full rounded-md border border-border bg-surface p-2 text-sm text-ink"
      />

      {query.trim().length === 0 && (
        <p className="text-xs text-ink-muted">{t("hint")}</p>
      )}
      {isFetching && <p className="text-xs text-ink-muted">{t("searching")}</p>}
      {isError && <p className="text-xs text-critical">{t("error")}</p>}
      {results && results.length === 0 && query.trim().length > 0 && !isFetching && (
        <p className="text-xs text-ink-muted">{t("noMatches")}</p>
      )}

      {results && results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((r) => (
            <li key={r.version.id} className="rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/projects/${projectId}/documents/${r.document.id}`}
                  className="text-sm font-medium text-ink hover:text-signal hover:underline"
                >
                  {r.document.name}
                </Link>
                <span className="font-mono text-xs text-ink-muted">{t("rank", { rank: r.rank.toFixed(3) })}</span>
              </div>
              {r.version.extracted_text && (
                <p className="mt-1.5 line-clamp-2 text-xs text-ink-secondary">
                  {r.version.extracted_text}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
