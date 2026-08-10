"use client";

import Link from "next/link";

import { VendorPermissionError, resolveTermLabel, useVendorListQuery } from "@/lib/vendors/hooks";
import type { OntologyTermOut } from "@/lib/api/types";
import type { VendorListFilters } from "@/lib/vendors/hooks";

const TYPE_LABEL: Record<string, string> = {
  person: "Person",
  vendor_org: "Vendor",
  internal_staff: "Internal",
};

/**
 * `GET /parties`, server-side filtered (app/api/parties.py's list_parties
 * takes type/city/vendor_category as real query params — this milestone's
 * own WHAT TO BUILD #1). A 403 (a project_manager-only user who navigated
 * here directly, nav entry hidden or not — F0's own "UX nicety, not a
 * security boundary" position) renders as an explainable permission
 * message, never a blank list a viewer could mistake for "no vendors yet."
 */
export function VendorList({
  filters,
  categoryTerms,
}: {
  filters: VendorListFilters;
  categoryTerms: OntologyTermOut[] | undefined;
}) {
  const { data: parties, isLoading, isError, error } = useVendorListQuery(filters);

  if (isError) {
    if (error instanceof VendorPermissionError) {
      return (
        <p className="text-sm text-ink-muted">
          The vendor directory is Finance/Procurement only. You don&apos;t hold that role on any
          project in this organisation, so there&apos;s nothing here for you to see.
        </p>
      );
    }
    return <p className="text-sm text-critical">Could not load the vendor directory. Please retry.</p>;
  }

  if (isLoading) return <p className="text-sm text-ink-muted">Loading vendors…</p>;
  if (!parties || parties.length === 0) {
    return <p className="text-sm text-ink-muted">No parties match this filter.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {parties.map((party) => {
        const category = party.vendor_category_term_id
          ? resolveTermLabel(categoryTerms, party.vendor_category_term_id)
          : null;
        return (
          <li key={party.id} className="rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/vendors/${party.id}`}
                className="text-sm font-medium text-ink hover:text-signal hover:underline"
              >
                {party.display_name}
              </Link>
              <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-xs font-medium text-ink-muted">
                {TYPE_LABEL[party.type] ?? party.type}
              </span>
            </div>
            <p className="mt-1.5 flex flex-wrap gap-2 font-mono text-xs text-ink-muted">
              {category ? (
                <span className="rounded-full bg-dusk-soft px-2 py-0.5 text-dusk">{category.label_en}</span>
              ) : (
                <span>uncategorised</span>
              )}
              {party.city && <span>· {party.city}</span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
