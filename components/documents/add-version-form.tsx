"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { MembershipRole } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";
import { useAddVersionMutation } from "@/lib/documents/hooks";

/**
 * FR-DOC-02: a new version, correctly superseding the old one — the
 * backend repoints `current_version_id` in the same transaction
 * (app/documents/service.py's add_version docstring), never left for this
 * form to do separately.
 */
export function AddVersionForm({
  projectId,
  documentId,
  effectiveRoles,
}: {
  projectId: string;
  documentId: string;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("documents.versionHistory.addForm");
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const addVersionMutation = useAddVersionMutation(projectId);

  if (!hasAnyRole(effectiveRoles, WRITE_ROLES)) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary hover:border-signal hover:text-signal"
      >
        {t("openButton")}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!file) return;
        addVersionMutation.mutate(
          { documentId, file, extractedText: extractedText || undefined },
          {
            onSuccess: () => {
              setOpen(false);
              setFile(null);
              setExtractedText("");
            },
          },
        );
      }}
      className="mb-3 flex flex-col gap-2 rounded-md border border-border p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-ink-secondary">
          {t("fileLabel")}
          <input
            required
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-56 text-sm text-ink"
          />
        </label>
      </div>
      <label className="text-xs text-ink-secondary">
        {t("extractedTextLabel")}
        <textarea
          value={extractedText}
          onChange={(e) => setExtractedText(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={addVersionMutation.isPending}
          className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {addVersionMutation.isPending ? t("submitting") : t("submit")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary"
        >
          {t("cancel")}
        </button>
        {addVersionMutation.isError && (
          <p className="text-xs text-critical">{t("error")}</p>
        )}
      </div>
    </form>
  );
}
