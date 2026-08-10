"use client";

import { useState } from "react";

import { useProjectsQuery, useVendorCategoryTermsQuery } from "@/lib/vendors/hooks";
import type { PartyType } from "@/lib/api/types";
import type { VendorListFilters } from "@/lib/vendors/hooks";

import { SectionPanel } from "../living-wip/section-panel";
import { VendorList } from "./vendor-list";

const TYPE_OPTIONS: { value: PartyType | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "vendor_org", label: "Vendor" },
  { value: "person", label: "Person" },
  { value: "internal_staff", label: "Internal" },
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
        <span className="text-sm font-medium text-ink">Vendors</span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <SectionPanel title="Vendor directory">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="text-xs text-ink-secondary">
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PartyType | "")}
                className="mt-1 block w-40 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-secondary">
              Category
              <select
                value={vendorCategory}
                onChange={(e) => setVendorCategory(e.target.value)}
                className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
              >
                <option value="">All categories</option>
                {categoryTerms?.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label_en}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-secondary">
              City
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Exact city"
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
