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
    mutationFn: async (body: { type: string; external_ref?: string | null; display_name?: string | null }) => {
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

/**
 * `GET .../channels/whatsapp/conversations` — backs the real picker
 * ("Layer B Channel Picker" prompt) that replaces the free-text `external_ref`
 * input for `type="whatsapp"`. Deliberately not `staleTime`d the way
 * `useChannelTypesQuery` is: the backend's own docstring is explicit that
 * this is a live Layer A lookup on every call, never a static list, so this
 * hook shouldn't paper over that with client-side caching either. Only
 * enabled once "whatsapp" is the selected type — no reason to hit Layer A
 * for a picker that isn't shown.
 */
export function useWhatsAppConversationsQuery(projectId: string, enabled: boolean) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["whatsapp-conversations", projectId],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/channels/whatsapp/conversations", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
    enabled,
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

/**
 * The capture debug console's own raw-message view — real `Message` rows
 * (app/capture/models.py), independent of extraction: a message shows up
 * here the moment capture durably writes it, whether or not extraction has
 * run yet. No `refetchInterval` (unlike health history) — this view has its
 * own explicit "Pull now" action to drive new data in, not a passive poll.
 */
export function channelMessagesQueryKey(projectId: string, channelId: string) {
  return ["channel-messages", projectId, channelId] as const;
}

export function useChannelMessagesQuery(projectId: string, channelId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: channelMessagesQueryKey(projectId, channelId),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/channels/{channel_id}/messages", {
        params: { path: { project_id: projectId, channel_id: channelId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * The real arq job state behind a "pull now" — polled while the job is
 * still `queued`/`deferred`/`in_progress` (every 2s, TanStack Query's own
 * function form of `refetchInterval` reading the *previous* response to
 * decide whether to keep going), stopping itself the moment the job
 * resolves to `complete` (success or failure) or `not_found`. Enabled
 * unconditionally, not just after a fresh "Pull now" click in this
 * session — a pull triggered by the scheduled worker, a different tab, or
 * an earlier visit to this same page is exactly the kind of "is something
 * already happening?" question a debug console should answer honestly on
 * load, not only for actions taken through this exact page instance.
 */
export function channelCaptureStatusQueryKey(projectId: string, channelId: string) {
  return ["channel-capture-status", projectId, channelId] as const;
}

export function useChannelCaptureStatusQuery(projectId: string, channelId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: channelCaptureStatusQueryKey(projectId, channelId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/projects/{project_id}/channels/{channel_id}/capture/status",
        { params: { path: { project_id: projectId, channel_id: channelId } } },
      );
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "in_progress" || status === "deferred" ? 2_000 : false;
    },
  });
}

/**
 * The debug console's manual "pull now" trigger — enqueues the real arq
 * ingestion job (app/capture/worker.py's ingest_channel_job) in the
 * background; this call itself returns immediately (`queued`), it does not
 * wait for the pull to finish. Invalidates the capture-status query (above)
 * on success so the UI starts reflecting the new job's real state
 * immediately, rather than waiting for that query's own next poll tick.
 */
export function usePullChannelNowMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      const { data, error } = await api.POST(
        "/projects/{project_id}/channels/{channel_id}/capture/pull-now",
        { params: { path: { project_id: projectId, channel_id: channelId } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, channelId) => {
      queryClient.invalidateQueries({ queryKey: channelCaptureStatusQueryKey(projectId, channelId) });
    },
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
