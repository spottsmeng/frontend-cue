"use client";

import Link from "next/link";

import { formatDate } from "@/lib/format";
import { VendorOrganisationPermissionError, useVendorOrganisationHistoryQuery } from "@/lib/vendors/hooks";

/**
 * FR-NRM-04, read-only this session (WHAT TO BUILD #4 — the write side,
 * `POST .../organisation`, belongs in F7's Admin console; this session
 * only links there, or notes the gap since F7 isn't built yet, per this
 * milestone's own instruction). Rendered only for a `type: "person"` party
 * (the caller decides that) — `GET .../organisation` doesn't error for a
 * `vendor_org`/`internal_staff` id, it just returns an honestly empty
 * history, which would be a confusing, meaningless-looking empty section on
 * a party this mapping was never about.
 *
 * The gate mismatch this milestone's own gap-audit originally found here
 * (`require_org_administrator` alone, stricter than every other read on
 * this page) was closed on the spot, not just documented — `GET
 * .../organisation`/`.../organisation/current` are
 * `require_org_finance_or_administrator`-gated now (see that dependency's
 * own docstring in app/api/deps.py). `VendorOrganisationPermissionError`
 * stays a real, typed case here regardless — a role revoked mid-session
 * (this query can refetch independently of the page's own initial load)
 * still needs an explainable message, not a silent blank section.
 */
export function OrganisationMappingPanel({ partyId }: { partyId: string }) {
  const { data, isLoading, isError, error } = useVendorOrganisationHistoryQuery(partyId, true);

  if (isError) {
    if (error instanceof VendorOrganisationPermissionError) {
      return (
        <p className="text-sm text-ink-muted">
          You don&apos;t currently hold a Finance/Procurement or administrator role on any project in
          this organisation, so this section isn&apos;t visible to you.
        </p>
      );
    }
    return <p className="text-sm text-critical">Could not load organisation history. Please retry.</p>;
  }

  if (isLoading) return <p className="text-sm text-ink-muted">Loading…</p>;

  const history = data ?? [];
  if (history.length === 0) {
    return <p className="text-sm text-ink-muted">No organisation mapping recorded for this contact.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5">
        {history.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <span className="text-ink">
              {row.role_title ?? "Represents"} —{" "}
              <Link
                href={`/vendors/${row.organisation_party_id}`}
                className="text-signal hover:underline"
              >
                view vendor
              </Link>
            </span>
            <span className="font-mono text-xs text-ink-muted">
              {formatDate(row.effective_from)} – {row.effective_to ? formatDate(row.effective_to) : "present"}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-muted">
        Editing this mapping is an Admin console action (FR-NRM-04) — F7&apos;s Admin console isn&apos;t
        built yet in this plan, so there&apos;s nowhere to link to it from here.
      </p>
    </div>
  );
}
