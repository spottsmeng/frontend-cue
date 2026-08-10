import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { AdminPermissionError } from "@/lib/admin/members-hooks";

/**
 * `GET /admin/channel-identities` — FR-NRM-03's manual-override review
 * queue, `require_org_administrator`-gated. `max_confidence` is what an
 * Administrator reviewing low-confidence auto-resolutions actually needs
 * (Prompt F7's own NON-OBVIOUS note); this screen defaults to a review-
 * queue framing (`max_confidence=0.7`) rather than dumping every resolved
 * identity in the organisation.
 */
export function channelIdentitiesQueryKey(filters: { maxConfidence?: number }) {
  return ["admin", "channel-identities", filters] as const;
}

export function useChannelIdentitiesQuery(filters: { maxConfidence?: number } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: channelIdentitiesQueryKey(filters),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/channel-identities", {
        params: {
          query: { max_confidence: filters.maxConfidence ?? null, manually_verified: null },
        },
      });
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

/** FR-NRM-03's manual override — upserts by (channel_type, external_id),
 * whether correcting a low-confidence auto-resolution or setting a
 * brand-new mapping. */
export function useOverrideChannelIdentityMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { channel_type: string; external_id: string; party_id: string }) => {
      const { data, error } = await api.POST("/admin/channel-identities/override", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "channel-identities"] }),
  });
}
