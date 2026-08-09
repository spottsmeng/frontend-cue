import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { reportQueryKey } from "@/lib/reports/hooks";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportQueryKey(projectId) });
    },
  });
}
