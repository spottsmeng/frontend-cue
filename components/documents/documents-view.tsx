"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useEffectiveRoles } from "@/lib/roles";
import { useDeliverableClassTermsQuery } from "@/lib/documents/hooks";

import { SectionPanel } from "../living-wip/section-panel";
import { DocumentList } from "./document-list";
import { DocumentSearchPanel } from "./document-search-panel";
import { UploadDocumentForm } from "./upload-document-form";

/**
 * PRD §6.6 (FR-DOC). Same "sections as bounded panels" shell every other
 * surface uses (DESIGN.md's layout concept) — a list/search panel plus the
 * upload entry point; document detail (lineage, versions, approval,
 * tagging, spec claims) is its own route, `documents/[documentId]`, not a
 * drawer here.
 */
export function DocumentsView({ projectId }: { projectId: string }) {
  const t = useTranslations("documents.overview");
  const { data: roles } = useEffectiveRoles(projectId);
  const { data: classTerms } = useDeliverableClassTermsQuery(projectId);
  const [classFilter, setClassFilter] = useState<string>("");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur">
        <span className="text-sm font-medium text-ink">{t("title")}</span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <SectionPanel title={t("searchSectionTitle")}>
          <DocumentSearchPanel projectId={projectId} />
        </SectionPanel>

        <SectionPanel
          title={t("allDocumentsSectionTitle")}
          action={<UploadDocumentForm projectId={projectId} effectiveRoles={roles?.roles} />}
        >
          <div className="mb-3 flex items-center gap-2">
            <label className="text-xs text-ink-secondary">
              {t("filterByClass")}
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="ml-2 rounded-md border border-border bg-surface p-1.5 text-xs text-ink"
              >
                <option value="">{t("allClasses")}</option>
                {classTerms?.map((term) => (
                  <option key={term.code} value={term.id}>
                    {term.label_en}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DocumentList
            projectId={projectId}
            classTerms={classTerms}
            classTermFilter={classFilter || null}
          />
        </SectionPanel>
      </div>
    </div>
  );
}
