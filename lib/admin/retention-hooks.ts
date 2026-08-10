import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { AdminPermissionError } from "@/lib/admin/members-hooks";

/**
 * `RetentionPolicy` resolves org x vertical x region -> a single
 * `retention_days`, NULL-broadening — the same narrowing/broadening shape
 * `ThresholdConfigPanel` (`components/foresight/threshold-config-panel.tsx`)
 * already established for foresight thresholds (Prompt F7's own
 * NON-OBVIOUS note: reuse the pattern, don't reinvent it). Org-wide,
 * `require_org_administrator`-gated — no `project_id` axis at all, a
 * genuinely flat list this session renders as one table rather than a
 * per-project screen.
 */
export function retentionPoliciesQueryKey() {
  return ["admin", "retention"] as const;
}

export function useRetentionPoliciesQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: retentionPoliciesQueryKey(),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/retention", {});
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

export function useCreateRetentionPolicyMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      vertical_id?: string | null;
      region?: string | null;
      retention_days: number;
    }) => {
      const { data, error } = await api.POST("/admin/retention", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: retentionPoliciesQueryKey() }),
  });
}

export function useUpdateRetentionPolicyMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ policyId, retentionDays }: { policyId: string; retentionDays: number }) => {
      const { data, error } = await api.PATCH("/admin/retention/{policy_id}", {
        params: { path: { policy_id: policyId } },
        body: { retention_days: retentionDays },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: retentionPoliciesQueryKey() }),
  });
}

export function useDeleteRetentionPolicyMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policyId: string) => {
      const { error } = await api.DELETE("/admin/retention/{policy_id}", {
        params: { path: { policy_id: policyId } },
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: retentionPoliciesQueryKey() }),
  });
}
