import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { AdminPermissionError } from "@/lib/admin/members-hooks";
import type { MembershipCreate } from "@/lib/api/types";

/**
 * `GET /admin/projects` — a frontend-enablement addition this milestone
 * made on the spot (backend/PROGRESS.md's "round 7"): genuinely org-wide,
 * `require_org_administrator`-gated, unlike `GET /projects`
 * (`lib/vendors/hooks.ts`'s `useProjectsQuery`), which is FR-ADM-02's own
 * membership-filtered view. Every screen in this console already runs at
 * the org-administrator tier, so the project picker itself should be as
 * complete as `GET /admin/delegations`/`GET /admin/roles` — an
 * Administrator on project A but never a member of project B still needs
 * to *find* B here, the same property `require_org_administrator`'s own
 * docstring establishes for every other `/admin/*` read.
 */
export function orgProjectsQueryKey() {
  return ["admin", "projects"] as const;
}

export function useAdminProjectsQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: orgProjectsQueryKey(),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/projects", {});
      if (response.status === 403) {
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

/** Resolves a raw project id (e.g. `DelegationOut.project_id`,
 * `MembershipOut.project_id`) to a real name against an already-fetched
 * `useAdminProjectsQuery` list — the raw id, never a guess, if it's not (or
 * not yet) in the fetched set. Same "resolve or say so honestly" posture
 * `lib/members/hooks.ts`'s `resolveMemberLabel` and `lib/admin/
 * members-hooks.ts`'s `resolveUserLabel` already establish. */
export function resolveProjectLabel(
  projects: { id: string; name: string }[] | undefined,
  projectId: string,
): string {
  return projects?.find((p) => p.id === projectId)?.name ?? projectId;
}

/**
 * FR-ADM-06: provisioning and initial member assignment as one call, under
 * the PRD's own "under 10 minutes" bar (`POST /projects` — `ProjectCreate.
 * members` grants initial access in the same request, per
 * `app/api/projects.py`'s own docstring). No `archetype_code`/
 * `vertical_code` field on this form's own body type below — both resolve
 * to their sole real value at v1 with the field simply omitted (confirmed
 * by reading `app/twin/models.py`'s `MilestoneArchetype` docstring and
 * `alembic/versions/9b2f8bc21d89_seed_default_event_production_archetype.py`
 * directly: `organisation_id` is empty at v1 — "no tenant-authored
 * archetype UI exists" — and exactly one archetype/vertical is seeded in
 * the whole system, so a picker would only ever offer one option; see
 * frontend/PROGRESS.md's F7 notes for the full write-up of this judgment
 * call, the same "check before building a picker for a set of exactly one
 * option" instruction this milestone's own prompt named up front).
 */
export function useCreateProjectMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      client_name?: string | null;
      venue?: string | null;
      timezone: string;
      event_start?: string | null;
      event_end?: string | null;
      members: MembershipCreate[];
    }) => {
      // `vertical_code`/`archetype_code` deliberately hardcoded to the
      // schema's own sole real default rather than exposed as caller-
      // settable fields — see this function's own docstring above.
      const { data, error } = await api.POST("/projects", {
        body: { ...body, vertical_code: "event-production" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: orgProjectsQueryKey() });
    },
  });
}
