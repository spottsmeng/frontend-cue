import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import type { DelegationCreate, MembershipRole } from "@/lib/api/types";

/**
 * `require_org_administrator`'s 403 ("administrator role required on at
 * least one project in this organisation") — every org-wide read/write in
 * this file is gated on it. Same typed-error posture
 * `lib/foresight/hooks.ts`'s `ForesightPermissionError` and
 * `lib/vendors/hooks.ts`'s `VendorPermissionError` already establish, so a
 * write-role viewer who lands here directly (nav hides the `/admin` link,
 * per F0's "UX nicety, not a security boundary" position) sees an
 * explainable message, not a generic failure.
 */
export class AdminPermissionError extends Error {}

function isForbidden(status: number) {
  return status === 403;
}

// --- Org-wide user directory (GET /admin/users) -----------------------

export function orgUsersQueryKey() {
  return ["admin", "users"] as const;
}

export function useOrgUsersQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: orgUsersQueryKey(),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/users", {});
      if (isForbidden(response.status)) {
        throw new AdminPermissionError(
          "administrator role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    retry: (failureCount, err) => !(err instanceof AdminPermissionError) && failureCount < 3,
    staleTime: 60_000,
  });
}

/** Resolves a raw user id to a real label — `display_name` when set,
 * `email` otherwise, the raw id (never a guess) if the id isn't in the
 * fetched set. Same "resolve or say so honestly" posture
 * `lib/members/hooks.ts`'s `resolveMemberLabel` already establishes for
 * project-scoped `ProjectMemberOut`, applied here to org-wide `UserOut` —
 * this is the fix `Prompt F7`'s own NON-OBVIOUS note named explicitly for
 * `DelegationOut`'s four raw-uuid columns. */
export function resolveUserLabel(
  users: { id: string; display_name: string | null; email: string }[] | undefined,
  userId: string,
): string {
  const user = users?.find((u) => u.id === userId);
  return user ? (user.display_name ?? user.email) : userId;
}

// --- Org-wide role assignments (GET /admin/roles) ----------------------

export function orgRolesQueryKey(filters: { projectId?: string; userId?: string }) {
  return ["admin", "roles", filters] as const;
}

export function useOrgRolesQuery(filters: { projectId?: string; userId?: string } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: orgRolesQueryKey(filters),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/roles", {
        params: { query: { project_id: filters.projectId ?? null, user_id: filters.userId ?? null } },
      });
      if (isForbidden(response.status)) {
        throw new AdminPermissionError(
          "administrator role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    retry: (failureCount, err) => !(err instanceof AdminPermissionError) && failureCount < 3,
  });
}

// --- Project membership (FR-ADM-06's standalone "assign members" step) --

export function useAddMemberMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; role: MembershipRole }) => {
      const { data, error } = await api.POST("/projects/{project_id}/members", {
        params: { path: { project_id: projectId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
      queryClient.invalidateQueries({ queryKey: orgRolesQueryKey({ projectId }) });
    },
  });
}

// --- Org-wide delegation audit (GET /admin/delegations, FR-ADM-04) ------

export function orgDelegationsQueryKey(filters: { projectId?: string; activeOnly?: boolean }) {
  return ["admin", "delegations", filters] as const;
}

export function useOrgDelegationsQuery(filters: { projectId?: string; activeOnly?: boolean } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: orgDelegationsQueryKey(filters),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/delegations", {
        params: {
          query: { project_id: filters.projectId ?? null, active_only: filters.activeOnly ?? false },
        },
      });
      if (isForbidden(response.status)) {
        throw new AdminPermissionError(
          "administrator role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    retry: (failureCount, err) => !(err instanceof AdminPermissionError) && failureCount < 3,
  });
}

function invalidateDelegations(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  queryClient.invalidateQueries({ queryKey: ["admin", "delegations"] });
  queryClient.invalidateQueries({ queryKey: orgRolesQueryKey({ projectId }) });
}

/** FR-ADM-03: time-boxed, keyed by `delegate_email` — no picker needed,
 * confirmed by reading `DelegationCreate` directly (Prompt F7's own
 * NON-OBVIOUS note). Project-scoped write (`POST .../delegations`,
 * `Depends(get_project)` — a delegator may only lend a role they
 * themselves hold), distinct from the org-wide read above. */
export function useGrantDelegationMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: DelegationCreate) => {
      const { data, error } = await api.POST("/projects/{project_id}/delegations", {
        params: { path: { project_id: projectId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateDelegations(queryClient, projectId),
  });
}

export function useRevokeDelegationMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (delegationId: string) => {
      const { data, error } = await api.POST(
        "/projects/{project_id}/delegations/{delegation_id}/revoke",
        { params: { path: { project_id: projectId, delegation_id: delegationId } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateDelegations(queryClient, projectId),
  });
}

/**
 * Same revoke call as `useRevokeDelegationMutation` above, not bound to a
 * single `projectId` at hook-call time — the org-wide Delegations screen
 * (`GET /admin/delegations`) lists rows spanning every project in the org
 * at once, so `project_id` has to travel with each mutate call instead of
 * being fixed by the surrounding component the way the per-project Members
 * & Delegations screen's own `useRevokeDelegationMutation` is.
 */
export function useRevokeAnyDelegationMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, delegationId }: { projectId: string; delegationId: string }) => {
      const { data, error } = await api.POST(
        "/projects/{project_id}/delegations/{delegation_id}/revoke",
        { params: { path: { project_id: projectId, delegation_id: delegationId } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { projectId }) => invalidateDelegations(queryClient, projectId),
  });
}
