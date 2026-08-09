import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { reportQueryKey } from "@/lib/reports/hooks";

export function writebackHistoryQueryKey(projectId: string, commitmentId: string) {
  return ["writeback-history", projectId, commitmentId] as const;
}

/** FR-WBK-08's audit trail — filtered server-side to one commitment, per
 * app/api/writeback.py's list_writeback_history's own commitment_id query
 * param (confirmed by reading that endpoint's actual signature, not
 * assumed). */
export function useWritebackHistoryQuery(projectId: string, commitmentId: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: commitmentId
      ? writebackHistoryQueryKey(projectId, commitmentId)
      : ["writeback-history", "none"],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/writeback", {
        params: { path: { project_id: projectId }, query: { commitment_id: commitmentId! } },
      });
      if (error) throw error;
      return data;
    },
    enabled: commitmentId !== null,
  });
}

function invalidateHistory(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  commitmentId: string,
) {
  queryClient.invalidateQueries({ queryKey: writebackHistoryQueryKey(projectId, commitmentId) });
  queryClient.invalidateQueries({ queryKey: reportQueryKey(projectId) });
}

/** FR-WBK-01/02/03: composes a single closed question — never sends
 * anything by itself. Entry point is always "from this commitment"
 * (OutboundMessage.commitment_id is NOT NULL by design), so this takes a
 * commitment id, never a channel/vendor picked independently. */
export function useDraftWritebackMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commitmentId: string) => {
      const { data, error } = await api.POST("/projects/{project_id}/writeback/draft", {
        params: { path: { project_id: projectId } },
        body: { commitment_id: commitmentId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateHistory(queryClient, projectId, data.commitment_id),
  });
}

/** The edit half of "review/edit before authorisation" — draft_text only,
 * only while status === "draft" (409 otherwise, surfaced to the caller). */
export function useEditWritebackDraftMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ outboundId, draftText }: { outboundId: string; draftText: string }) => {
      const { data, error } = await api.PATCH("/projects/{project_id}/writeback/{outbound_id}", {
        params: { path: { project_id: projectId, outbound_id: outboundId } },
        body: { draft_text: draftText },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateHistory(queryClient, projectId, data.commitment_id),
  });
}

/** FR-WBK-05's required, separate human step — the only call that ever
 * sets authorised_by/authorised_at. */
export function useAuthoriseWritebackMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (outboundId: string) => {
      const { data, error } = await api.POST(
        "/projects/{project_id}/writeback/{outbound_id}/authorise",
        { params: { path: { project_id: projectId, outbound_id: outboundId } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => invalidateHistory(queryClient, projectId, data.commitment_id),
  });
}

/** Only callable on an already-authorised draft (409); rejects once the
 * group's daily rate ceiling is already met (429) — the mutation surfaces
 * both distinctly rather than a generic failure toast. */
export function useSendWritebackMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (outboundId: string) => {
      const { data, error, response } = await api.POST(
        "/projects/{project_id}/writeback/{outbound_id}/send",
        { params: { path: { project_id: projectId, outbound_id: outboundId } } },
      );
      if (error) {
        const detail = (error as { detail?: string }).detail;
        throw new Error(
          response.status === 429
            ? (detail ?? "today's rate ceiling for this vendor group has already been reached")
            : (detail ?? "send failed"),
        );
      }
      return data;
    },
    onSuccess: (data) => invalidateHistory(queryClient, projectId, data.commitment_id),
  });
}
