"use client";

import { useState } from "react";

import { useProjectMembersQuery } from "@/lib/members/hooks";
import {
  AdminPermissionError,
  resolveUserLabel,
  useAddMemberMutation,
  useGrantDelegationMutation,
  useOrgDelegationsQuery,
  useOrgUsersQuery,
  useRevokeDelegationMutation,
} from "@/lib/admin/members-hooks";
import { MEMBERSHIP_ROLES, ROLE_LABEL } from "@/lib/admin/constants";
import type { MembershipRole } from "@/lib/api/types";

import { SectionPanel } from "../living-wip/section-panel";
import { DelegationRow } from "./delegation-row";

/**
 * WHAT TO BUILD #3: grant/view/revoke membership + delegation, one project
 * at a time — delegation's time-boxed scope/expiry shown clearly (FR-ADM-
 * 03/04). `DelegationCreate` is keyed by `delegate_email`, not a user id
 * (confirmed by reading the schema directly, Prompt F7's own NON-OBVIOUS
 * note) — no picker for the delegate, a plain email field, same as adding a
 * member. `GET /admin/roles`/`GET /admin/delegations` are filtered to this
 * `project_id` here, distinct from the org-wide, unfiltered screens under
 * `/admin/delegations`.
 */
export function ProjectMembersView({ projectId }: { projectId: string }) {
  const { data: members, isLoading: membersLoading } = useProjectMembersQuery(projectId);
  const { data: users } = useOrgUsersQuery();
  const {
    data: delegations,
    isLoading: delegationsLoading,
    isError: delegationsError,
    error: delegationsErrorValue,
  } = useOrgDelegationsQuery({ projectId });

  const addMemberMutation = useAddMemberMutation(projectId);
  const grantMutation = useGrantDelegationMutation(projectId);
  const revokeMutation = useRevokeDelegationMutation(projectId);

  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<MembershipRole>("project_manager");

  const [delegateEmail, setDelegateEmail] = useState("");
  const [delegateRole, setDelegateRole] = useState<MembershipRole>("project_manager");
  const [expiresAt, setExpiresAt] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel title="Members">
        {membersLoading && <p className="text-sm text-ink-muted">Loading…</p>}
        {members && (
          <ul className="mb-3 flex flex-col gap-1.5">
            {members.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="text-ink">{m.display_name ?? m.email}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink-muted">{m.email}</span>
                  <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-xs text-ink-secondary">
                    {ROLE_LABEL[m.role]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!memberEmail) return;
            addMemberMutation.mutate(
              { email: memberEmail, role: memberRole },
              { onSuccess: () => setMemberEmail("") },
            );
          }}
          className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
        >
          <label className="text-xs text-ink-secondary">
            Email
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            />
          </label>
          <label className="text-xs text-ink-secondary">
            Role
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as MembershipRole)}
              className="mt-1 block w-44 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            >
              {MEMBERSHIP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={addMemberMutation.isPending}
            className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Grant / update access
          </button>
          {addMemberMutation.isError && (
            <p className="w-full text-xs text-critical">
              {(addMemberMutation.error as { detail?: string })?.detail ??
                "Could not grant access — is that email a known CUE user?"}
            </p>
          )}
        </form>
      </SectionPanel>

      <SectionPanel title="Delegations">
        {delegationsLoading && <p className="text-sm text-ink-muted">Loading…</p>}
        {delegationsError &&
          (delegationsErrorValue instanceof AdminPermissionError ? (
            <p className="text-sm text-ink-muted">
              Viewing this project&apos;s delegation history is Administrator only.
            </p>
          ) : (
            <p className="text-sm text-critical">Could not load delegations. Please retry.</p>
          ))}
        {delegations && delegations.length === 0 && (
          <p className="mb-3 text-sm text-ink-muted">No delegations on this project yet.</p>
        )}
        {delegations && delegations.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1.5">
            {delegations.map((d) => (
              <DelegationRow
                key={d.id}
                delegation={d}
                delegatorLabel={resolveUserLabel(users, d.delegator_id)}
                delegateLabel={resolveUserLabel(users, d.delegate_id)}
                grantedByLabel={resolveUserLabel(users, d.granted_by)}
                revokedByLabel={d.revoked_by ? resolveUserLabel(users, d.revoked_by) : ""}
                revoking={revokeMutation.isPending}
                onRevoke={() => revokeMutation.mutate(d.id)}
              />
            ))}
          </ul>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!delegateEmail || !expiresAt) return;
            grantMutation.mutate(
              {
                delegate_email: delegateEmail,
                role: delegateRole,
                expires_at: new Date(expiresAt).toISOString(),
              },
              { onSuccess: () => setDelegateEmail("") },
            );
          }}
          className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
        >
          <label className="text-xs text-ink-secondary">
            Delegate email
            <input
              type="email"
              value={delegateEmail}
              onChange={(e) => setDelegateEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            />
          </label>
          <label className="text-xs text-ink-secondary">
            Role
            <select
              value={delegateRole}
              onChange={(e) => setDelegateRole(e.target.value as MembershipRole)}
              className="mt-1 block w-44 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            >
              {MEMBERSHIP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-secondary">
            Expires
            <input
              required
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 block w-52 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={grantMutation.isPending}
            className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Grant delegation
          </button>
          {grantMutation.isError && (
            <p className="w-full text-xs text-critical">
              {(grantMutation.error as { detail?: string })?.detail ?? "Could not grant delegation."}
            </p>
          )}
        </form>
      </SectionPanel>
    </div>
  );
}
