import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import type {
  DependencyCreate,
  DependencyUpdate,
  MilestoneCreate,
  MilestoneUpdate,
  PropagateCandidate,
  TwinErrorBody,
} from "@/lib/api/types";

// One invalidation surface for every query this milestone reads — PATCH on
// a milestone/dependency already triggers Twin recomputation server-side
// (frontend/PROGRESS.md's F1-adjacent non-obvious note carried into this
// prompt), so every mutation below invalidates all four rather than trying
// to patch the cache in place; `/twin/current` has no cached snapshot to go
// stale server-side either (app/api/twin.py's own docstring), so a refetch
// is always cheap and always fresh.
export function twinQueryKeys(projectId: string) {
  return {
    milestones: ["milestones", projectId] as const,
    dependencies: ["dependencies", projectId] as const,
    current: ["twin-current", projectId] as const,
    constraint: ["twin-constraint", projectId] as const,
  };
}

function invalidateTwin(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  const keys = twinQueryKeys(projectId);
  queryClient.invalidateQueries({ queryKey: keys.milestones });
  queryClient.invalidateQueries({ queryKey: keys.dependencies });
  queryClient.invalidateQueries({ queryKey: keys.current });
  queryClient.invalidateQueries({ queryKey: keys.constraint });
}

export function useMilestonesQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: twinQueryKeys(projectId).milestones,
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/milestones", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useDependenciesQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: twinQueryKeys(projectId).dependencies,
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/milestones/dependencies", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * FR-TWN-03 — no cached snapshot server-side (app/api/twin.py's twin_current
 * docstring), so `staleTime: 0` mirrors that on the client the same way
 * lib/reports/hooks.ts's useReportQuery does for the Living WIP report:
 * always refetched after any mutation, never polled.
 */
export function useTwinCurrentQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: twinQueryKeys(projectId).current,
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/twin/current", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });
}

/** FR-TWN-06, current (unshifted) graph only — see usePropagateMutation for the post-shift constraint. */
export function useTwinConstraintQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: twinQueryKeys(projectId).constraint,
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/twin/constraint", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });
}

/**
 * `GET /projects/{id}/ontology-terms?category=milestone_type` — F0's own
 * discovery endpoint, added for exactly this picker (this milestone's own
 * NON-OBVIOUS note: never hardcode CUE-PRD.md §4.2's term list client-side).
 * Long staleTime: reference-data, same posture lib/roles.ts's
 * useEffectiveRoles takes for membership data that rarely changes mid-session.
 */
export function useMilestoneTypeTermsQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["ontology-terms", projectId, "milestone_type"],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/ontology-terms", {
        params: { path: { project_id: projectId }, query: { category: "milestone_type" } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * F9 gap-audit fix (frontend/CLAUDE.md's Class A checklist) — closes F2's
 * own documented, still-open debt: `MilestoneOut.type_term_id` had no
 * resolver anywhere, so a milestone's type was never displayed at all
 * (F2's own notes: "this session works around it by simply never
 * displaying a milestone's type"). `useMilestoneTypeTermsQuery` above was
 * already being fetched for the add-milestone picker — this just reuses
 * it, same per-surface-owns-its-own-copy convention
 * lib/foresight/hooks.ts's own `resolveTermLabel` already established (not
 * imported cross-surface).
 */
export function resolveTermLabel(
  terms: { id: string; code: string; label_en: string }[] | undefined,
  termId: string | null | undefined,
): { code: string; label_en: string } | null {
  if (!termId) return null;
  const term = terms?.find((t) => t.id === termId);
  return term ? { code: term.code, label_en: term.label_en } : null;
}

export function useCreateMilestoneMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: MilestoneCreate) => {
      const { data, error } = await api.POST("/projects/{project_id}/milestones", {
        params: { path: { project_id: projectId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateTwin(queryClient, projectId),
  });
}

/** FR-TWN-10: every field on `MilestoneUpdate` is optional — send only what changed, never the full row. */
export function useUpdateMilestoneMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ milestoneId, body }: { milestoneId: string; body: MilestoneUpdate }) => {
      const { data, error } = await api.PATCH("/projects/{project_id}/milestones/{milestone_id}", {
        params: { path: { project_id: projectId, milestone_id: milestoneId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateTwin(queryClient, projectId),
  });
}

/**
 * A 409 here (milestone still referenced by a Dependency) is an expected,
 * explainable outcome, not a generic failure — the backend refuses rather
 * than cascading (backend/app/api/milestones.py's delete_milestone
 * docstring: "a deliberate separate step"). Callers should check the
 * dependency list themselves (already loaded via useDependenciesQuery) to
 * name which edges block the delete *before* even attempting it, since the
 * 409 body itself is just a flat string, not a structured list — see
 * TwinErrorBody's own comment.
 */
export function useDeleteMilestoneMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (milestoneId: string) => {
      const { error, response } = await api.DELETE("/projects/{project_id}/milestones/{milestone_id}", {
        params: { path: { project_id: projectId, milestone_id: milestoneId } },
      });
      if (response.status === 409) {
        throw new TwinConflictError((error as unknown as TwinErrorBody).detail);
      }
      if (error) throw error;
    },
    onSuccess: () => invalidateTwin(queryClient, projectId),
  });
}

/** Thrown for both the create-dependency cycle 422 and the delete-milestone referenced-edge 409 — both are a flat `{detail: string}`, never openapi-fetch's typed HTTPValidationError shape (TwinErrorBody's own comment). */
export class TwinConflictError extends Error {}

export function useCreateDependencyMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: DependencyCreate) => {
      const { data, error, response } = await api.POST("/projects/{project_id}/milestones/dependencies", {
        params: { path: { project_id: projectId } },
        body,
      });
      if (response.status === 422) {
        throw new TwinConflictError((error as unknown as TwinErrorBody).detail);
      }
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateTwin(queryClient, projectId),
  });
}

export function useUpdateDependencyMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dependencyId, body }: { dependencyId: string; body: DependencyUpdate }) => {
      const { data, error } = await api.PATCH("/projects/{project_id}/milestones/dependencies/{dependency_id}", {
        params: { path: { project_id: projectId, dependency_id: dependencyId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateTwin(queryClient, projectId),
  });
}

export function useDeleteDependencyMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dependencyId: string) => {
      const { error } = await api.DELETE("/projects/{project_id}/milestones/dependencies/{dependency_id}", {
        params: { path: { project_id: projectId, dependency_id: dependencyId } },
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateTwin(queryClient, projectId),
  });
}

/**
 * §11.2's own resource table lists `recompute` distinct from `current` —
 * kept here as a real, separate manual affordance even though it's
 * computationally redundant with a plain refetch of `/twin/current` (both
 * run the same live, uncached CPM pass — app/api/twin.py's own docstring):
 * what actually distinguishes it is the audit trail entry it leaves behind
 * server-side (a PM's explicit "recompute now" is worth recording; a page
 * load isn't). Documented in frontend/PROGRESS.md's F2 notes rather than
 * dropped as pure duplication.
 */
export function useRecomputeMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/projects/{project_id}/twin/recompute", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateTwin(queryClient, projectId),
  });
}

/**
 * FR-TWN-05/06/07 — a pure read (app/twin/graph.py's propagate() docstring:
 * "mutates nothing... the caller never persists this"). Deliberately NOT
 * invalidating or touching any cached query on success: this is genuinely
 * non-destructive exploration, and invalidating `/twin/current` here would
 * misleadingly suggest the simulation changed something real. One or more
 * `candidates` in the same call is FR-TWN-07's own "recovery options"
 * side-by-side comparison surface, not a second endpoint.
 */
export function usePropagateMutation(projectId: string) {
  const api = useApiClient();
  return useMutation({
    mutationFn: async (candidates: PropagateCandidate[]) => {
      const { data, error } = await api.POST("/projects/{project_id}/twin/propagate", {
        params: { path: { project_id: projectId } },
        body: { candidates },
      });
      if (error) throw error;
      return data;
    },
  });
}
