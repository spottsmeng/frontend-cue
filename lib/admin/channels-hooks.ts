import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";

/**
 * `GET /channel-types` — `Channel.type` is validated against this
 * reference table at request time, not a static enum (Prompt F7's own
 * NON-OBVIOUS note), so the "attach channel" form's type picker is
 * populated from here, not a hardcoded list. `capability` non-null
 * (`require_capability=True` server-side) is the FK-free equivalent of the
 * old Literal's "minus manual" carve-out — a Channel resource can never be
 * "manual" (that value exists only for `Evidence.channel`).
 */
export function useChannelTypesQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["channel-types"],
    queryFn: async () => {
      const { data, error } = await api.GET("/channel-types", {
        params: { query: { capability: null } },
      });
      if (error) throw error;
      return (data ?? []).filter((t) => t.capability !== null);
    },
    staleTime: 5 * 60_000,
  });
}

export function channelsQueryKey(projectId: string) {
  return ["channels", projectId] as const;
}

export function useChannelsQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: channelsQueryKey(projectId),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/channels", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useAttachChannelMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { type: string; external_ref?: string | null }) => {
      const { data, error } = await api.POST("/projects/{project_id}/channels", {
        params: { path: { project_id: projectId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: channelsQueryKey(projectId) }),
  });
}

export function useDetachChannelMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await api.DELETE("/projects/{project_id}/channels/{channel_id}", {
        params: { path: { project_id: projectId, channel_id: channelId } },
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: channelsQueryKey(projectId) }),
  });
}

/**
 * `GET .../channels/{id}/health/history` is real, queryable history (the
 * arq worker writes every 15 minutes, FR-CAP-09) but has no push mechanism
 * — polled/refetched on an interval TanStack Query controls, never a
 * spinner implying a live socket (Prompt F7's own NON-OBVIOUS note).
 */
export function channelHealthHistoryQueryKey(projectId: string, channelId: string) {
  return ["channel-health-history", projectId, channelId] as const;
}

export function useChannelHealthHistoryQuery(projectId: string, channelId: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: channelId
      ? channelHealthHistoryQueryKey(projectId, channelId)
      : ["channel-health-history", "none"],
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/projects/{project_id}/channels/{channel_id}/health/history",
        { params: { path: { project_id: projectId, channel_id: channelId! } } },
      );
      if (error) throw error;
      return data;
    },
    enabled: channelId !== null,
    refetchInterval: 60_000,
  });
}

/** FR-ADM-09's reconnection workflow — a distinct admin action from
 * health-checking itself, not folded into the health display (Prompt F7's
 * own NON-OBVIOUS note). */
export function useReconnectChannelMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      const { data, error } = await api.POST(
        "/projects/{project_id}/channels/{channel_id}/reconnect",
        { params: { path: { project_id: projectId, channel_id: channelId } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, channelId) => {
      queryClient.invalidateQueries({ queryKey: channelsQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: channelHealthHistoryQueryKey(projectId, channelId) });
    },
  });
}
