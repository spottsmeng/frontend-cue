import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { reportQueryKey } from "@/lib/reports/hooks";

/**
 * `POST .../budget/revise` — FR-ADM-11: always a new Budget row (never an
 * in-place edit of the existing one), Finance/Producer-gated server-side.
 * The report's own budget-summary section is the only read surface this
 * milestone needs (there is no dedicated Budget history view in F1's
 * scope), so this hook only invalidates the report query, not a
 * budget-specific one.
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
    },
  });
}
