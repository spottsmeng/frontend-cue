import { useQuery } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import type { MembershipRole } from "@/lib/api/types";

// Mirrors app/identity/service.py's WRITE_ROLES/ADMIN_ROLES/FINANCE_ROLES
// exactly (same names, same membership) — a second, independent copy on
// purpose, not imported from anywhere: this is only ever the client's own
// "which actions to *show*" judgment call (app/api/deps.py's
// require_project_role docstring), never itself a security boundary. The
// server independently re-derives and enforces its own copy of each set on
// every mutating endpoint regardless of what this file says.
export const WRITE_ROLES: readonly MembershipRole[] = [
  "project_manager", "producer", "finance", "account_manager", "designer", "administrator",
];
export const ADMIN_ROLES: readonly MembershipRole[] = ["administrator", "producer"];
export const FINANCE_ROLES: readonly MembershipRole[] = ["finance", "producer"];

export function hasAnyRole(
  effectiveRoles: readonly MembershipRole[] | undefined,
  allowed: readonly MembershipRole[],
): boolean {
  if (!effectiveRoles) return false;
  return effectiveRoles.some((r) => allowed.includes(r));
}

/**
 * `GET /projects/{project_id}/members/me` — backs every role-gated control
 * this milestone renders (payment-status, budget-revise, write-back,
 * deviation-confirm, verify). Long staleTime: a membership/delegation
 * change is rare and not something this UI needs to reflect within the same
 * session; a fresh sign-in (a fresh QueryClient, per app/providers.tsx) is
 * enough to pick up a change made elsewhere.
 */
export function useEffectiveRoles(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["effective-roles", projectId],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/members/me", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}
