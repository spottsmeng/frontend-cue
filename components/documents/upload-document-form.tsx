"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { MembershipRole } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";
import { useDeliverableClassTermsQuery, useUploadDocumentMutation } from "@/lib/documents/hooks";

/**
 * FR-DOC-01 ingestion. `POST /projects/{id}/documents` is multipart/form-
 * data, not JSON (this milestone's own READ FIRST note) — a real `<input
 * type="file">` plus lib/documents/hooks.ts's FormData-based mutation, not
 * the generated JSON client's default body shape.
 *
 * `extracted_text` is optional, not silently assumed: real OCR/parsing now
 * runs server-side when it's left blank (app/documents/service.py's
 * `_derive_extracted_text`, PDF/Office/image files) — a change made after
 * this milestone's own prompt file was written, which still describes OCR
 * as unwired; verified against the current backend, not the stale prompt
 * text (frontend/PROGRESS.md's F4 notes explain the discrepancy). The field
 * is still offered because derivation can fail or the file type may not be
 * supported — a caller who already has clean text can supply it directly
 * rather than trust a guess.
 */
export function UploadDocumentForm({
  projectId,
  effectiveRoles,
}: {
  projectId: string;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("documents.upload");
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [language, setLanguage] = useState("en");
  const [extractedText, setExtractedText] = useState("");
  const { data: classTerms } = useDeliverableClassTermsQuery(projectId);
  const uploadMutation = useUploadDocumentMutation(projectId);

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
        if (!file || !name) return;
        uploadMutation.mutate(
          {
            file,
            name,
            classCode: classCode || undefined,
            language,
            extractedText: extractedText || undefined,
          },
          {
            onSuccess: () => {
              setOpen(false);
              setFile(null);
              setName("");
              setClassCode("");
              setLanguage("en");
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
        <label className="flex-1 text-xs text-ink-secondary">
          {t("nameLabel")}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("classLabel")}
          <select
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            className="mt-1 block w-48 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          >
            <option value="">{t("untagged")}</option>
            {classTerms?.map((term) => (
              <option key={term.code} value={term.code}>
                {term.label_en}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-secondary">
          {t("languageLabel")}
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 block w-24 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
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
          disabled={uploadMutation.isPending}
          className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {uploadMutation.isPending ? t("submitting") : t("submit")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary"
        >
          {t("cancel")}
        </button>
        {uploadMutation.isError && (
          <p className="text-xs text-critical">{t("error")}</p>
        )}
      </div>
    </form>
  );
}
