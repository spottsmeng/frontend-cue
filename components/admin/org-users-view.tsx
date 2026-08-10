"use client";

import { AdminPermissionError, useOrgUsersQuery } from "@/lib/admin/members-hooks";
import { formatDateTime } from "@/lib/format";

import { SectionPanel } from "../living-wip/section-panel";

/**
 * `GET /admin/users` — §11.2's org-wide user list. No SCIM
 * pre-provisioning (out of scope, FR-ADM-05's own note) — only lists users
 * who have actually authenticated at least once, per the endpoint's own
 * docstring; this screen's copy says so rather than implying a fuller
 * directory exists.
 */
export function OrgUsersView() {
  const { data: users, isLoading, isError, error } = useOrgUsersQuery();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel title="Organisation users">
        {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
        {isError &&
          (error instanceof AdminPermissionError ? (
            <p className="text-sm text-ink-muted">
              This page is Administrator only. You don&apos;t hold that role on any project in this
              organisation.
            </p>
          ) : (
            <p className="text-sm text-critical">Could not load users. Please retry.</p>
          ))}
        {users && (
          <>
            <p className="mb-2 text-xs text-ink-muted">
              Every user who has signed in to CUE at least once — there is no pre-provisioning (no
              SCIM this build, FR-ADM-05).
            </p>
            <ul className="flex flex-col gap-1.5">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="text-ink">{u.display_name ?? u.email}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-ink-muted">{u.email}</span>
                    {!u.active && (
                      <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-xs text-ink-muted">
                        Inactive
                      </span>
                    )}
                    <span className="font-mono text-xs text-ink-muted">
                      joined {formatDateTime(u.created_at)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </SectionPanel>
    </div>
  );
}
