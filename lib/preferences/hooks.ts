import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import type { UserMeOut } from "@/lib/api/types";

/**
 * F9's own per-user preference surface (`GET/PATCH /users/me`,
 * NFR-ACC-03) — genuinely server state, not device-local UI state, per
 * lib/store/ui-store.ts's own stated boundary for what belongs in the
 * zustand store instead ("client-only UI state with no server
 * counterpart"). High contrast has a server counterpart (a real `users`
 * row), so it lives here, in TanStack Query, like every other piece of
 * server data in this app.
 */
export const meQueryKey = ["users", "me"] as const;

export function useMeQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async () => {
      const { data, error } = await api.GET("/users/me");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateHighContrastMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (highContrast: boolean) => {
      const { data, error } = await api.PATCH("/users/me", {
        body: { high_contrast: highContrast },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: UserMeOut) => {
      // Applies immediately, same frame as the click — doesn't wait for a
      // refetch, matching ThemeToggle's own instant-feedback shape (that one
      // sets the attribute directly in setTheme(); this one sets it here
      // since the source of truth is now the mutation response, not a
      // client-only store write).
      if (data.high_contrast) {
        document.documentElement.setAttribute("data-contrast", "high");
      } else {
        document.documentElement.removeAttribute("data-contrast");
      }
      queryClient.setQueryData(meQueryKey, data);
    },
  });
}
