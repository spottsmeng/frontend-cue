"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  useDeliverableClassTermsQuery,
  useDocumentMilestoneTypeTermsQuery,
  usePhaseTermsQuery,
  useTagDocumentMutation,
} from "@/lib/documents/hooks";
import type { DocumentOut, MembershipRole, OntologyTermOut } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";

function codeForTermId(terms: OntologyTermOut[] | undefined, termId: string | null): string {
  if (!termId) return "";
  return terms?.find((t) => t.id === termId)?.code ?? "";
}

/**
 * FR-DOC-03: auto-tag into deliverable_class/milestone_type/phase. Every
 * axis optional and independently settable (app/documents/service.py's
 * auto_tag docstring — one axis at a time without disturbing the others),
 * so this form submits only the axes actually changed rather than
 * re-sending every field on every save.
 */
export function DocumentTagForm({
  projectId,
  document,
  effectiveRoles,
}: {
  projectId: string;
  document: DocumentOut;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("documents.tagging");
  const { data: classTerms } = useDeliverableClassTermsQuery(projectId);
  const { data: milestoneTypeTerms } = useDocumentMilestoneTypeTermsQuery(projectId);
  const { data: phaseTerms } = usePhaseTermsQuery(projectId);

  if (!hasAnyRole(effectiveRoles, WRITE_ROLES)) return null;
  // Deferred until all three term lists have loaded — TagFormFields' own
  // useState defaults read from them once, at mount, so this document's
  // already-set tags show as pre-selected instead of blank on first paint.
  if (!classTerms || !milestoneTypeTerms || !phaseTerms) {
    return <p className="text-xs text-ink-muted">{t("loading")}</p>;
  }

  return (
    <TagFormFields
      projectId={projectId}
      document={document}
      classTerms={classTerms}
      milestoneTypeTerms={milestoneTypeTerms}
      phaseTerms={phaseTerms}
    />
  );
}

function TagFormFields({
  projectId,
  document,
  classTerms,
  milestoneTypeTerms,
  phaseTerms,
}: {
  projectId: string;
  document: DocumentOut;
  classTerms: OntologyTermOut[];
  milestoneTypeTerms: OntologyTermOut[];
  phaseTerms: OntologyTermOut[];
}) {
  const t = useTranslations("documents.tagging");
  const [classCode, setClassCode] = useState(() => codeForTermId(classTerms, document.class_term_id));
  const [milestoneTypeCode, setMilestoneTypeCode] = useState(() =>
    codeForTermId(milestoneTypeTerms, document.milestone_type_term_id),
  );
  const [phaseCode, setPhaseCode] = useState(() => codeForTermId(phaseTerms, document.phase_term_id));
  const tagMutation = useTagDocumentMutation(projectId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        tagMutation.mutate({
          documentId: document.id,
          body: {
            class_code: classCode || null,
            milestone_type_code: milestoneTypeCode || null,
            phase_code: phaseCode || null,
          },
        });
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="text-xs text-ink-secondary">
        {t("classLabel")}
        <select
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          className="mt-1 block w-44 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
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
        {t("milestoneTypeLabel")}
        <select
          value={milestoneTypeCode}
          onChange={(e) => setMilestoneTypeCode(e.target.value)}
          className="mt-1 block w-44 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
        >
          <option value="">{t("untagged")}</option>
          {milestoneTypeTerms?.map((term) => (
            <option key={term.code} value={term.code}>
              {term.label_en}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-ink-secondary">
        {t("phaseLabel")}
        <select
          value={phaseCode}
          onChange={(e) => setPhaseCode(e.target.value)}
          className="mt-1 block w-44 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
        >
          <option value="">{t("untagged")}</option>
          {phaseTerms?.map((term) => (
            <option key={term.code} value={term.code}>
              {term.label_en}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={tagMutation.isPending}
        className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {tagMutation.isPending ? t("submitting") : t("submit")}
      </button>
      {tagMutation.isError && <p className="text-xs text-critical">{t("error")}</p>}
    </form>
  );
}
