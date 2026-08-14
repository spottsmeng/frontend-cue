"use client";

import { useTranslations } from "next-intl";

import {
  AdminPermissionError,
  resolveUserLabel,
  useOrgDelegationsQuery,
  useOrgUsersQuery,
  useRevokeAnyDelegationMutation,
} from "@/lib/admin/members-hooks";
import { resolveProjectLabel, useAdminProjectsQuery } from "@/lib/admin/projects-hooks";

import { SectionPanel } from "../living-wip/section-panel";
import { DelegationRow } from "./delegation-row";

/**
 * FR-ADM-04's "full audit of... who granted what to whom" — org-wide,
 * `GET /admin/delegations`. `DelegationOut` carries four raw uuids
 * (`delegator_id`, `delegate_id`, `granted_by`, `revoked_by`) and a
 * `project_id`, none resolved server-side (Prompt F7's own NON-OBVIOUS
 * note, naming this exact shape) — resolved here against `GET /admin/users`
 * + `GET /admin/projects`, both fetched once, same `resolveMemberLabel`-
 * style pattern every prior milestone's own id resolver already
 * establishes. A delegation list a human can't read by name isn't a usable
 * admin screen (the note's own words); nothing here renders a bare uuid.
 */
export function OrgDelegationsView() {
  const t = useTranslations("admin.delegations");
  const { data: delegations, isLoading, isError, error } = useOrgDelegationsQuery();
  const { data: users } = useOrgUsersQuery();
  const { data: projects } = useAdminProjectsQuery();
  const revokeMutation = useRevokeAnyDelegationMutation();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4">
      <SectionPanel title={t("title")}>
        {isLoading && <p className="text-sm text-ink-muted">{t("loading")}</p>}
        {isError &&
          (error instanceof AdminPermissionError ? (
            <p className="text-sm text-ink-muted">{t("adminOnly")}</p>
          ) : (
            <p className="text-sm text-critical">{t("loadError")}</p>
          ))}
        {delegations && delegations.length === 0 && (
          <p className="text-sm text-ink-muted">{t("empty")}</p>
        )}
        {delegations && delegations.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {delegations.map((d) => (
              <DelegationRow
                key={d.id}
                delegation={d}
                delegatorLabel={resolveUserLabel(users, d.delegator_id)}
                delegateLabel={resolveUserLabel(users, d.delegate_id)}
                grantedByLabel={resolveUserLabel(users, d.granted_by)}
                revokedByLabel={d.revoked_by ? resolveUserLabel(users, d.revoked_by) : ""}
                projectLabel={resolveProjectLabel(projects, d.project_id)}
                revoking={revokeMutation.isPending}
                onRevoke={() => revokeMutation.mutate({ projectId: d.project_id, delegationId: d.id })}
              />
            ))}
          </ul>
        )}
      </SectionPanel>
    </div>
  );
}
