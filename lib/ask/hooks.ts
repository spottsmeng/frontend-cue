import { useMutation, useQuery } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import type { AskSummaryVariant } from "@/lib/api/types";

// --- Ask (query + follow-up, FR-ASK-01/02/03/08) --------------------------

/**
 * `POST .../ask/query` — a mutation, not a query: every call is a distinct
 * user-initiated question, never something to cache/refetch by key the way
 * a GET-backed resource is. `conversation_id` is omitted on the first
 * message of a session (the response mints a real one) and threaded back in
 * on every follow-up — the caller (chat-view.tsx) owns that state, this
 * hook just makes the call.
 */
export function useAskQueryMutation(projectId: string) {
  const api = useApiClient();
  return useMutation({
    mutationFn: async ({ question, conversationId }: { question: string; conversationId: string | null }) => {
      const { data, error } = await api.POST("/projects/{project_id}/ask/query", {
        params: { path: { project_id: projectId } },
        body: { question, conversation_id: conversationId },
      });
      if (error) throw error;
      return data;
    },
  });
}

// --- Summaries (FR-ASK-04/05) ----------------------------------------------

/**
 * `POST .../ask/summarise` — modelled as a `useQuery` (not a mutation)
 * despite the POST verb: each of the five variants is a real, cacheable
 * "read" the caller selects by switching tabs, the same auto-load-on-view
 * shape `useReportQuery` already establishes for Living WIP, not a
 * user-triggered one-off action (`period_digest` still needs its own dates
 * before `enabled` fires, since the backend 422s without them).
 */
export function useAskSummaryQuery(
  projectId: string,
  variant: AskSummaryVariant,
  period?: { start: string; end: string },
) {
  const api = useApiClient();
  const needsPeriod = variant === "period_digest";
  return useQuery({
    queryKey: ["ask-summary", projectId, variant, period ?? null],
    queryFn: async () => {
      const { data, error } = await api.POST("/projects/{project_id}/ask/summarise", {
        params: { path: { project_id: projectId } },
        body: {
          variant,
          period_start: period?.start ?? null,
          period_end: period?.end ?? null,
        },
      });
      if (error) throw error;
      return data;
    },
    enabled: !needsPeriod || Boolean(period?.start && period?.end),
  });
}

// --- Successor brief (FR-ASK-07) -------------------------------------------

/**
 * `POST .../ask/successor-brief` — §12.5: "one control; produces a
 * structured handover pack," a mutation the single button below fires, not
 * a query that loads on mount — the brief is meant to be generated on
 * demand for a specific handover moment, not kept warm in the background.
 */
export function useSuccessorBriefMutation(projectId: string) {
  const api = useApiClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/projects/{project_id}/ask/successor-brief", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

// --- Citation routing: document_version resolve (F5 frontend-enablement
// addition — GET .../documents/versions/{version_id}, backend/PROGRESS.md) -

export function useResolveDocumentVersionQuery(projectId: string, versionId: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["documents", projectId, "versions", versionId],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/documents/versions/{version_id}", {
        params: { path: { project_id: projectId, version_id: versionId as string } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(versionId),
    staleTime: 5 * 60_000,
  });
}
