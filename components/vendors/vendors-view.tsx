"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useProjectsQuery, useVendorCategoryTermsQuery } from "@/lib/vendors/hooks";
import type { PartyType } from "@/lib/api/types";
import type { VendorListFilters } from "@/lib/vendors/hooks";

import { SectionPanel } from "../living-wip/section-panel";
import { VendorList } from "./vendor-list";

const TYPE_OPTIONS: { value: PartyType | ""; key: string }[] = [
  { value: "", key: "allTypes" },
  { value: "vendor_org", key: "vendorOrg" },
  { value: "person", key: "person" },
  { value: "internal_staff", key: "internalStaff" },
];

/**
 * FR-VRG §6.13 — the Vendor Reliability Graph's own directory (WHAT TO
 * BUILD #1). Org-scoped, not nested under `/projects/[projectId]` (READ
 * FIRST note: Party lives at the organisation level, same reasoning
 * `/admin` and `/analytics` sit outside that route tree too — see
 * frontend/PROGRESS.md's F0 notes). Visible only to Finance/Producer-role
 * users at the nav level (app/(shell)/layout.tsx); the real gate is this
 * page's own 403 handling in VendorList, per F0's "UX nicety, not a
 * security boundary" position.
 */
export function VendorsView() {
  const t = useTranslations("vendors.vendorsView");
  const tType = useTranslations("vendors.partyType");
  const { data: projects } = useProjectsQuery();
  const anyProjectId = projects?.[0]?.id;
  const { data: categoryTerms } = useVendorCategoryTermsQuery(anyProjectId);

  const [type, setType] = useState<PartyType | "">("");
  const [city, setCity] = useState("");
  const [vendorCategory, setVendorCategory] = useState("");

  const filters: VendorListFilters = {
    type: type || undefined,
    city: city || undefined,
    vendorCategory: vendorCategory || undefined,
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur">
        <span className="text-sm font-medium text-ink">{t("title")}</span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <SectionPanel title={t("directoryTitle")}>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="text-xs text-ink-secondary">
              {t("type")}
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PartyType | "")}
                className="mt-1 block w-40 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {tType(opt.key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-secondary">
              {t("category")}
              <select
                value={vendorCategory}
                onChange={(e) => setVendorCategory(e.target.value)}
                className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
              >
                <option value="">{t("allCategories")}</option>
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
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("cityPlaceholder")}
                className="mt-1 block w-40 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
              />
            </label>
          </div>
          <VendorList filters={filters} categoryTerms={categoryTerms} />
        </SectionPanel>
      </div>
    </div>
  );
}
