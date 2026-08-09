import { useQuery } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import type { ProjectMemberOut } from "@/lib/api/types";

/**
 * `GET /projects/{project_id}/members` — a frontend-enablement addition
 * (backend/PROGRESS.md's "round 3" notes), added specifically so a picker
 * that needs to *name* a fellow project member (e.g. `DeviationResolveRequest.
 * resolution_owner`) doesn't have to fall back to a pasted UUID. Any
 * project member can read it (same tier as `useEffectiveRoles` /
 * `GET .../milestones`) — this is a read of "who's on my own project," not
 * an admin action, and distinct from the org-wide, org-admin-only
 * `GET /admin/roles`.
 */
export function useProjectMembersQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/members", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
    // Membership composition changes rarely mid-session — same staleTime
    // posture lib/roles.ts's useEffectiveRoles already takes for the
    // analogous reference-data read.
    staleTime: 5 * 60_000,
  });
}

/**
 * Resolves a user id (e.g. `DeviationOut.resolution_owner`) against an
 * already-fetched member list to a display label — `display_name` when
 * set, `email` otherwise (`User.display_name` is nullable; every seeded dev
 * user other than the role fixtures leaves it unset). Falls back to the raw
 * id, never a guess, if the id isn't (or is no longer) a member of this
 * project — the same "resolve or say so honestly" posture
 * `lib/foresight/hooks.ts`'s `resolveTermLabel` already establishes.
 */
export function resolveMemberLabel(members: ProjectMemberOut[] | undefined, userId: string): string {
  const member = members?.find((m) => m.user_id === userId);
  return member ? (member.display_name ?? member.email) : userId;
}
