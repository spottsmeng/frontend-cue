"use client";

import { useTranslations } from "next-intl";

import { useExportProjectMutation } from "@/lib/admin/export-hooks";

import { SectionPanel } from "../living-wip/section-panel";

/**
 * WHAT TO BUILD #11: `GET /admin/export/{project_id}?format=json|csv` — a
 * real file download either way (`csv` is a zip of per-table CSVs, not a
 * JSON preview, Prompt F7's own NON-OBVIOUS note), wired as a direct
 * button rather than a plain link since the endpoint needs the caller's
 * own bearer token (`lib/admin/download.ts`'s own note on why).
 */
export function ProjectExportView({ projectId }: { projectId: string }) {
  const t = useTranslations("admin.export");
  const exportMutation = useExportProjectMutation();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel title={t("title")}>
        <p className="mb-3 text-sm text-ink-muted">{t("description")}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate({ projectId, format: "json" })}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-ink-secondary hover:border-signal disabled:opacity-50"
          >
            {t("downloadJson")}
          </button>
          <button
            type="button"
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate({ projectId, format: "csv" })}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-ink-secondary hover:border-signal disabled:opacity-50"
          >
            {t("downloadCsv")}
          </button>
        </div>
        {exportMutation.isError && (
          <p className="mt-2 text-xs text-critical">{t("exportError")}</p>
        )}
      </SectionPanel>
    </div>
  );
}
