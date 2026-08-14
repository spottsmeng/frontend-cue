"use client";

import { useTranslations } from "next-intl";

import { distinctArchetypeCodes, useProjectsQuery, useVendorCategoryTermsQuery } from "@/lib/vendors/hooks";
import type { VendorSegment } from "@/lib/vendors/hooks";

/**
 * FR-VRG-02's three segmentation filters, re-queried on change (this
 * milestone's own WHAT TO BUILD #2). `vendor_category` is a real ontology-
 * terms picker (never a hardcoded CUE-PRD.md §4.2 list — the gap-audit
 * check every prior milestone's hook already follows). `event_archetype`
 * has no discovery endpoint of its own (`Project.archetype_code` is free
 * text, not an ontology_terms vocabulary — see lib/vendors/hooks.ts's
 * `distinctArchetypeCodes` docstring) — offered as the real, non-fabricated
 * set of archetype codes in use across this org's own projects, not an
 * invented list. `city` is genuinely free text on `Party` with no
 * discovery endpoint at all, so it's a plain text input, not a select
 * dressed up as one.
 */
export function SegmentPicker({
  segment,
  onChange,
}: {
  segment: VendorSegment;
  onChange: (segment: VendorSegment) => void;
}) {
  const t = useTranslations("vendors.segmentPicker");
  const { data: projects } = useProjectsQuery();
  const anyProjectId = projects?.[0]?.id;
  const { data: categoryTerms } = useVendorCategoryTermsQuery(anyProjectId);
  const archetypeCodes = distinctArchetypeCodes(projects);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-ink-secondary">
        {t("eventArchetype")}
        <select
          value={segment.eventArchetype ?? ""}
          onChange={(e) => onChange({ ...segment, eventArchetype: e.target.value || undefined })}
          className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
        >
          <option value="">{t("allArchetypes")}</option>
          {archetypeCodes.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs text-ink-secondary">
        {t("vendorCategory")}
        <select
          value={segment.vendorCategory ?? ""}
          onChange={(e) => onChange({ ...segment, vendorCategory: e.target.value || undefined })}
          className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
        >
          <option value="">{t("ownCategory")}</option>
          {categoryTerms?.map((term) => (
            <option key={term.code} value={term.code}>
              {term.label_en}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs text-ink-secondary">
        {t("city")}
        <input
          type="text"
          value={segment.city ?? ""}
          onChange={(e) => onChange({ ...segment, city: e.target.value || undefined })}
          placeholder={t("cityPlaceholder")}
          className="mt-1 block w-44 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
        />
      </label>
    </div>
  );
}
