import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { reportQueryKey } from "@/lib/reports/hooks";
import type { DeviationStatus } from "@/lib/api/types";

// F3 (Foresight) extends this file rather than duplicating a second
// deviations-hooks module — F1's useConfirmDeviationMutation below already
// established the domain's query/mutation home; the raw DeviationOut list/
// detail/resolve this milestone needs belong alongside it, not in
// lib/foresight/hooks.ts (which owns Risk/Notification/Webhook/Threshold/
// QuietHours — genuinely separate resources with their own lifecycle).

export function deviationsQueryKey(projectId: string, status?: DeviationStatus) {
  return ["deviations", projectId, status ?? null] as const;
}

/**
 * FR-DEV-05's own listing — server-side status filter via the endpoint's
 * own query param, same "don't fetch everything and filter client-side"
 * discipline this milestone's own prompt applies to the Risk feed too.
 */
export function useDeviationsQuery(projectId: string, status?: DeviationStatus) {
  const api = useApiClient();
  return useQuery({
    queryKey: deviationsQueryKey(projectId, status),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/deviations", {
        params: { path: { project_id: projectId }, query: { status: status ?? null } },
      });
      if (error) throw error;
      return data;
    },
  });
}

function invalidateDeviations(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  queryClient.invalidateQueries({ queryKey: ["deviations", projectId] });
  queryClient.invalidateQueries({ queryKey: reportQueryKey(projectId) });
}

/**
 * `POST .../deviations/{id}/confirm` — FR-DEV-04's "PM confirms or edits",
 * same two-step verify-style pattern app/api/deviations.py's own docstring
 * names: an empty body confirms an auto-drafted row as-is,
 * `description_en` set corrects it in the same call.
 */
export function useConfirmDeviationMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviationId,
      descriptionEn,
    }: {
      deviationId: string;
      descriptionEn?: string;
    }) => {
      const { data, error } = await api.POST("/projects/{project_id}/deviations/{deviation_id}/confirm", {
        params: { path: { project_id: projectId, deviation_id: deviationId } },
        body: { description_en: descriptionEn ?? null },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateDeviations(queryClient, projectId),
  });
}

/** `POST .../deviations/{id}/resolve` — FR-DEV-03: resolution date + owner. */
export function useResolveDeviationMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviationId,
      resolutionDate,
      resolutionOwner,
    }: {
      deviationId: string;
      resolutionDate: string;
      resolutionOwner: string;
    }) => {
      const { data, error } = await api.POST("/projects/{project_id}/deviations/{deviation_id}/resolve", {
        params: { path: { project_id: projectId, deviation_id: deviationId } },
        body: { resolution_date: resolutionDate, resolution_owner: resolutionOwner },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateDeviations(queryClient, projectId),
  });
}
