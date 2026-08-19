import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { AdminPermissionError } from "@/lib/admin/members-hooks";
import type { LayerAAlertConfigUpdate, LayerAAlertState, LayerAAlertType } from "@/lib/api/types";

// One hooks.ts per surface, per this codebase's own convention (see
// lib/analytics/hooks.ts's own note) — every Layer A observability query
// lives here rather than reaching into another surface's hooks file.
// Every route is administrator-only (require_org_administrator,
// app/api/layer_a_admin.py), so every query below shares the same
// AdminPermissionError 403 handling lib/admin/*-hooks.ts already
// establishes — reused, not reinvented.

export function layerAAccountsQueryKey() {
  return ["admin", "layer-a", "accounts"] as const;
}

/** Live status, proxied through the backend on every call (Layer A's own
 * admin API has no session/token exchange, so freshness here just means
 * "ask again") — refetched on an interval by the caller, not this hook
 * itself, so a read-only viewer of the panel still sees it update without
 * needing to know about polling. */
export function useLayerAAccountsQuery(options: { refetchInterval?: number } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: layerAAccountsQueryKey(),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/layer-a/accounts");
      if (response.status === 503) return { accounts: [], unconfigured: true as const };
      if (response.status === 403) {
        throw new AdminPermissionError(
          "administrator role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return { accounts: data, unconfigured: false as const };
    },
    retry: (failureCount, err) => !(err instanceof AdminPermissionError) && failureCount < 3,
    refetchInterval: options.refetchInterval,
  });
}

export function layerAMultiTrendQueryKey(accountIds: string[]) {
  return ["admin", "layer-a", "multi-trend", ...accountIds] as const;
}

/** Fans out GET .../trend across up to five selected accounts and returns
 * one row list per account — same Promise.all fan-out convention
 * lib/analytics/hooks.ts's own useAnalyticsCommitmentsQuery establishes for
 * "no batch endpoint exists, and doesn't need to for this cardinality." */
export function useLayerAMultiTrendQuery(accountIds: string[]) {
  const api = useApiClient();
  return useQuery({
    queryKey: layerAMultiTrendQueryKey(accountIds),
    queryFn: async () => {
      const results = await Promise.all(
        accountIds.map(async (account_id) => {
          const { data, error, response } = await api.GET(
            "/admin/layer-a/accounts/{account_id}/trend",
            { params: { path: { account_id }, query: {} } },
          );
          if (response.status === 403) {
            throw new AdminPermissionError(
              "administrator role required on at least one project in this organisation",
            );
          }
          if (error) throw error;
          return { accountId: account_id, snapshots: data };
        }),
      );
      return results;
    },
    enabled: accountIds.length > 0,
    retry: (failureCount, err) => !(err instanceof AdminPermissionError) && failureCount < 3,
  });
}

export function layerAAlertsQueryKey(filters: { state?: LayerAAlertState; alertType?: LayerAAlertType }) {
  return ["admin", "layer-a", "alerts", filters] as const;
}

export function useLayerAAlertsQuery(filters: { state?: LayerAAlertState; alertType?: LayerAAlertType } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: layerAAlertsQueryKey(filters),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/layer-a/alerts", {
        params: { query: { state: filters.state ?? null, alert_type: filters.alertType ?? null } },
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

export function useAcknowledgeLayerAAlertMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await api.POST("/admin/layer-a/alerts/{alert_id}/acknowledge", {
        params: { path: { alert_id: alertId } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "layer-a", "alerts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "layer-a", "open-alert-count"] });
    },
  });
}

export function layerAAlertDeliveriesQueryKey(alertId: string) {
  return ["admin", "layer-a", "alert-deliveries", alertId] as const;
}

export function useLayerAAlertDeliveriesQuery(alertId: string, enabled: boolean) {
  const api = useApiClient();
  return useQuery({
    queryKey: layerAAlertDeliveriesQueryKey(alertId),
    queryFn: async () => {
      const { data, error } = await api.GET("/admin/layer-a/alerts/{alert_id}/deliveries", {
        params: { path: { alert_id: alertId } },
      });
      if (error) throw error;
      return data;
    },
    enabled,
  });
}

export function layerAAlertConfigQueryKey() {
  return ["admin", "layer-a", "config"] as const;
}

export function useLayerAAlertConfigQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: layerAAlertConfigQueryKey(),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/layer-a/config");
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

export function useUpdateLayerAAlertConfigMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: LayerAAlertConfigUpdate) => {
      const { data, error } = await api.PUT("/admin/layer-a/config", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: layerAAlertConfigQueryKey() }),
  });
}

export function layerAOpenAlertCountQueryKey() {
  return ["admin", "layer-a", "open-alert-count"] as const;
}

/** TopNav's always-visible badge (locked design decision: an active alert
 * must be visible before an admin even opens the dashboard) — polled on an
 * interval by the caller. */
export function useOpenLayerAAlertsCountQuery(options: { refetchInterval?: number; enabled?: boolean } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: layerAOpenAlertCountQueryKey(),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/layer-a/alerts/open/count");
      if (response.status === 403) return { count: 0 }; // not an admin — no badge, not an error toast
      if (error) throw error;
      return data;
    },
    refetchInterval: options.refetchInterval,
    enabled: options.enabled,
  });
}
