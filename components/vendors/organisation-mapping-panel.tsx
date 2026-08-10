"use client";

import { useState } from "react";
import Link from "next/link";

import { formatDate } from "@/lib/format";
import {
  VendorOrganisationPermissionError,
  VendorOrganisationWritePermissionError,
  useSetOrganisationMutation,
  useVendorListQuery,
  useVendorOrganisationHistoryQuery,
} from "@/lib/vendors/hooks";

/**
 * FR-NRM-04. Read side unchanged from F6 — rendered only for a
 * `type: "person"` party (the caller decides that), `require_org_finance_
 * or_administrator`-gated (round 6's own gate-mismatch fix).
 *
 * Write side added during F7's Admin console, per that milestone's own
 * cross-milestone note ("add the write control to whatever detail view F6
 * built, rather than duplicating a vendor detail screen") — `POST
 * .../organisation` stays `require_org_administrator`-only, a stricter,
 * genuinely different gate from the read above (a Finance/Producer viewer
 * can see this history but not add to it), so `VendorOrganisationWrite
 * PermissionError` is a real, distinct 403 case from the read's own
 * `VendorOrganisationPermissionError` — most Finance-role viewers of this
 * page will see the history but hit this on the form specifically, an
 * expected outcome, not a bug.
 */
export function OrganisationMappingPanel({ partyId }: { partyId: string }) {
  const { data, isLoading, isError, error } = useVendorOrganisationHistoryQuery(partyId, true);
  const { data: vendorOrgs } = useVendorListQuery({ type: "vendor_org" });
  const setOrganisationMutation = useSetOrganisationMutation(partyId);

  const [organisationPartyId, setOrganisationPartyId] = useState("");
  const [roleTitle, setRoleTitle] = useState("");

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

  return (
    <div className="flex flex-col gap-3">
      {history.length === 0 ? (
        <p className="text-sm text-ink-muted">No organisation mapping recorded for this contact.</p>
      ) : (
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
                {formatDate(row.effective_from)} –{" "}
                {row.effective_to ? formatDate(row.effective_to) : "present"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!organisationPartyId) return;
          setOrganisationMutation.mutate(
            { organisation_party_id: organisationPartyId, role_title: roleTitle || null },
            { onSuccess: () => setRoleTitle("") },
          );
        }}
        className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
      >
        <label className="text-xs text-ink-secondary">
          Vendor
          <select
            value={organisationPartyId}
            onChange={(e) => setOrganisationPartyId(e.target.value)}
            className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          >
            <option value="">Select a vendor…</option>
            {vendorOrgs?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-secondary">
          Role title (optional)
          <input
            type="text"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="e.g. Account Director"
            className="mt-1 block w-48 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={!organisationPartyId || setOrganisationMutation.isPending}
          className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Set organisation
        </button>
        {setOrganisationMutation.isError &&
          (setOrganisationMutation.error instanceof VendorOrganisationWritePermissionError ? (
            <p className="w-full text-xs text-ink-muted">
              Setting this mapping is Administrator only — you don&apos;t hold that role on any
              project in this organisation.
            </p>
          ) : (
            <p className="w-full text-xs text-critical">Could not save — please retry.</p>
          ))}
      </form>
    </div>
  );
}
