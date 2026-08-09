import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { reportQueryKey } from "@/lib/reports/hooks";
import type {
  ForesightErrorBody,
  ForesightThresholdMetric,
  RiskSeverity,
  RiskSource,
  RiskStatus,
  WebhookEventType,
} from "@/lib/api/types";

/**
 * `acknowledge_risk`/`resolve_risk`'s 409 ("cannot acknowledge/resolve a
 * {status} risk", app/api/risks.py) is this milestone's own documented race
 * condition — two people looking at the same stale list. Every mutation
 * below refetches the risk feed in `onSettled`, not just `onSuccess`, so a
 * 409 still resolves into the risk's real current status on screen instead
 * of a dead-ended error toast (this milestone's own NON-OBVIOUS note).
 */
export class ForesightConflictError extends Error {}

/**
 * `require_org_administrator`'s 403 ("administrator role required on at
 * least one project in this organisation", app/api/deps.py) — expected for
 * most write-role viewers of the threshold config panel, not a bug; carried
 * as a typed error (openapi-fetch's own `error` value is just the parsed
 * body, with no `status` of its own) so the panel can render an explainable
 * permission message instead of a generic failure.
 */
export class ForesightPermissionError extends Error {}

// --- Risks -------------------------------------------------------------

export interface RiskFilters {
  status?: RiskStatus;
  source?: RiskSource;
  severity?: RiskSeverity;
}

export function riskFeedQueryKey(projectId: string, filters: RiskFilters) {
  return ["risks", projectId, filters] as const;
}

/**
 * Filtering is server-side via the endpoint's own query params
 * (app/api/risks.py's list_risks) — this milestone's own explicit
 * instruction not to fetch everything and filter client-side.
 */
export function useRiskFeedQuery(projectId: string, filters: RiskFilters) {
  const api = useApiClient();
  return useQuery({
    queryKey: riskFeedQueryKey(projectId, filters),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/risks", {
        params: {
          path: { project_id: projectId },
          query: {
            status: filters.status ?? null,
            source: filters.source ?? null,
            severity: filters.severity ?? null,
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

function invalidateRisks(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  queryClient.invalidateQueries({ queryKey: ["risks", projectId] });
  queryClient.invalidateQueries({ queryKey: reportQueryKey(projectId) });
}

export function useAcknowledgeRiskMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (riskId: string) => {
      const { data, error, response } = await api.POST(
        "/projects/{project_id}/risks/{risk_id}/acknowledge",
        { params: { path: { project_id: projectId, risk_id: riskId } } },
      );
      if (response.status === 409) {
        throw new ForesightConflictError((error as unknown as ForesightErrorBody).detail);
      }
      if (error) throw error;
      return data;
    },
    onSettled: () => invalidateRisks(queryClient, projectId),
  });
}

export function useResolveRiskMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (riskId: string) => {
      const { data, error, response } = await api.POST(
        "/projects/{project_id}/risks/{risk_id}/resolve",
        { params: { path: { project_id: projectId, risk_id: riskId } } },
      );
      if (response.status === 409) {
        throw new ForesightConflictError((error as unknown as ForesightErrorBody).detail);
      }
      if (error) throw error;
      return data;
    },
    onSettled: () => invalidateRisks(queryClient, projectId),
  });
}

// --- Notifications -------------------------------------------------------

export function notificationsQueryKey(projectId: string) {
  return ["notifications", projectId] as const;
}

export function useNotificationsQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: notificationsQueryKey(projectId),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/notifications", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useAcknowledgeNotificationMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await api.POST(
        "/projects/{project_id}/notifications/{notification_id}/acknowledge",
        { params: { path: { project_id: projectId, notification_id: notificationId } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey(projectId) }),
  });
}

// --- Webhook subscriptions -------------------------------------------------

export function webhooksQueryKey(projectId: string) {
  return ["webhooks", projectId] as const;
}

export function useWebhooksQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: webhooksQueryKey(projectId),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/webhooks", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWebhookMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, eventTypes }: { url: string; eventTypes: WebhookEventType[] }) => {
      const { data, error } = await api.POST("/projects/{project_id}/webhooks", {
        params: { path: { project_id: projectId } },
        body: { url, event_types: eventTypes },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhooksQueryKey(projectId) }),
  });
}

export function useDeleteWebhookMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await api.DELETE("/projects/{project_id}/webhooks/{subscription_id}", {
        params: { path: { project_id: projectId, subscription_id: subscriptionId } },
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webhooksQueryKey(projectId) }),
  });
}

// --- Foresight thresholds (org-admin, app/api/foresight_admin.py's
// threshold_router — require_org_administrator, NOT project-scoped) --------

export const thresholdsQueryKey = ["foresight-thresholds"] as const;

export function useThresholdsQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: thresholdsQueryKey,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/foresight-thresholds", {});
      if (response.status === 403) {
        throw new ForesightPermissionError(
          "administrator role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    retry: (failureCount, err) => !(err instanceof ForesightPermissionError) && failureCount < 3,
  });
}

export function useCreateThresholdMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      metric: ForesightThresholdMetric;
      value: number;
      project_id?: string | null;
      deviation_class_term_id?: string | null;
    }) => {
      const { data, error } = await api.POST("/admin/foresight-thresholds", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: thresholdsQueryKey }),
  });
}

export function useUpdateThresholdMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ thresholdId, value }: { thresholdId: string; value: number }) => {
      const { data, error } = await api.PATCH("/admin/foresight-thresholds/{threshold_id}", {
        params: { path: { threshold_id: thresholdId } },
        body: { value },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: thresholdsQueryKey }),
  });
}

export function useDeleteThresholdMutation() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (thresholdId: string) => {
      const { error } = await api.DELETE("/admin/foresight-thresholds/{threshold_id}", {
        params: { path: { threshold_id: thresholdId } },
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: thresholdsQueryKey }),
  });
}

// --- Quiet hours (per-project, FR-NTF-04) -----------------------------------

export function quietHoursQueryKey(projectId: string) {
  return ["quiet-hours", projectId] as const;
}

export function useQuietHoursQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: quietHoursQueryKey(projectId),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/quiet-hours", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSetQuietHoursMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      quiet_start_local: string;
      quiet_end_local: string;
      critical_severity_threshold: RiskSeverity;
    }) => {
      const { data, error } = await api.PUT("/projects/{project_id}/quiet-hours", {
        params: { path: { project_id: projectId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quietHoursQueryKey(projectId) }),
  });
}

// --- Reference data: deviation_class ontology terms -------------------------

/**
 * `GET .../ontology-terms?category=deviation_class` — same discovery
 * endpoint lib/twin/hooks.ts's useMilestoneTypeTermsQuery reads for
 * milestone_type. Now that `OntologyTermOut.id` is a real field (backend/
 * PROGRESS.md's "round 3" frontend-enablement notes), this doubles as the
 * resolver for an already-persisted `DeviationOut.class_term_id` — see
 * `resolveTermLabel` below and `components/foresight/deviation-row.tsx`.
 */
export function useDeviationClassTermsQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["ontology-terms", projectId, "deviation_class"],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/ontology-terms", {
        params: { path: { project_id: projectId }, query: { category: "deviation_class" } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Resolves a `*_term_id` FK against an already-fetched ontology-terms list —
 * a plain `Map` lookup, not a second request per row. Falls back to `null`
 * (never a guess) if the id genuinely isn't in the fetched set — e.g. the
 * list is still loading, or (a real if unlikely case) the term was retired
 * from this project's effective vocabulary after the Deviation referencing
 * it was created; callers render that as an honest "unknown class", not a
 * blank or a thrown error.
 */
export function resolveTermLabel(
  terms: { id: string; code: string; label_en: string }[] | undefined,
  termId: string,
): { code: string; label_en: string } | null {
  const term = terms?.find((t) => t.id === termId);
  return term ? { code: term.code, label_en: term.label_en } : null;
}
