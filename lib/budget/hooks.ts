import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { reportQueryKey } from "@/lib/reports/hooks";

/**
 * `POST .../budget/revise` — FR-ADM-11: always a new Budget row (never an
 * in-place edit of the existing one), Finance/Producer-gated server-side.
 * The report's own budget-summary section is the only read surface F1
 * needed, so this hook only invalidates the report query, not a
 * budget-specific one — F7's own `useBudgetHistoryQuery` below invalidates
 * its own key on top of this.
 */
export function useReviseBudgetMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { approved_amount: number; currency: string }) => {
      const { data, error } = await api.POST("/projects/{project_id}/budget/revise", {
        params: { path: { project_id: projectId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: budgetHistoryQueryKey(projectId) });
      // A real bug F7's own e2e run caught: a revision's own current-baseline
      // display stayed stale (still showing the pre-revision amount) because
      // this mutation, added back in F1 for the report summary alone, never
      // invalidated the current-budget query F7 later added — the report
      // section happened to refetch anyway (its own staleTime: 0), masking
      // this for F1's own surface, but ProjectBudgetView's `useBudgetQuery`
      // has no such forced refetch. Fixed on the spot, not left as a known
      // gap — see frontend/PROGRESS.md's F7 notes.
      queryClient.invalidateQueries({ queryKey: currentBudgetQueryKey(projectId) });
    },
  });
}

// --- F7 Admin console: baseline creation + history --------------------

export function currentBudgetQueryKey(projectId: string) {
  return ["budget", projectId, "current"] as const;
}

/** `GET .../budget` 404s honestly when no baseline exists yet — surfaced as
 * `data === undefined` via TanStack Query's own `retry: false` on a 404,
 * not a thrown error the panel has to unwrap, since "no baseline yet" is
 * the ordinary first-visit state for this screen, not a failure. */
export function useBudgetQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: currentBudgetQueryKey(projectId),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/projects/{project_id}/budget", {
        params: { path: { project_id: projectId } },
      });
      if (response.status === 404) return null;
      if (error) throw error;
      return data;
    },
  });
}

/** FR-ADM-11's first Budget row for a project — 409s if one already exists
 * (`useReviseBudgetMutation` above is the only path once it does; the
 * panel picks which mutation to offer based on `useBudgetQuery`'s own
 * result, never both at once). */
export function useCreateBudgetMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { approved_amount: number; currency: string }) => {
      const { data, error } = await api.POST("/projects/{project_id}/budget", {
        params: { path: { project_id: projectId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentBudgetQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: reportQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: budgetHistoryQueryKey(projectId) });
    },
  });
}

export function budgetHistoryQueryKey(projectId: string) {
  return ["budget", projectId, "history"] as const;
}

/** `GET .../budget/history` — a frontend-enablement addition this
 * milestone made on the spot (backend/PROGRESS.md's "round 7"): the only
 * way to see a baseline alongside the revision that superseded it,
 * `revision_of`-linked, most recent first. */
export function useBudgetHistoryQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: budgetHistoryQueryKey(projectId),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/budget/history", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
  });
}
