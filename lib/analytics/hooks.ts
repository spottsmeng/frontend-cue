import { useQuery } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import type { CommitmentOut, OutboundMessageOut, ProjectOut } from "@/lib/api/types";

/**
 * `require_org_administrator`'s 403 on `GET /admin/cost-summary`
 * (app/api/deps.py) — same typed-error-per-gate pattern
 * `lib/vendors/hooks.ts`'s `VendorPermissionError` already established, so
 * the cost panel can render an explainable message instead of a generic
 * failure. This dashboard is otherwise open to any project member (the
 * verification-burden/reply-rate panels only need `GET .../commitments` and
 * `GET .../writeback`, both any-member-readable) — only this one panel sits
 * behind the stricter org-administrator tier, so it gates itself rather
 * than the whole page.
 */
export class CostSummaryPermissionError extends Error {}

// Each surface owns its own hooks file rather than importing
// lib/commitments/hooks.ts / lib/writeback/hooks.ts — neither has an
// unfiltered "list everything for this project" query (both existing hooks
// there are scoped to a single commitment), and this codebase's own
// convention (lib/foresight/resolve-term-label.ts vs.
// lib/members/resolve-member-label.ts, frontend/PROGRESS.md's F4 notes) is
// to duplicate a small per-surface query rather than reach across surfaces
// for one.

export function analyticsProjectsQueryKey() {
  return ["analytics", "projects"] as const;
}

/**
 * Neither commitments nor write-back has an org-wide or cross-project
 * endpoint (only GET /projects/{id}/commitments and GET /projects/{id}/
 * writeback, both project-scoped) — PRD §13's own "per project" framing
 * means this dashboard fans out over every project the caller can see, the
 * same way app/(shell)/layout.tsx already fans out `members/me` calls.
 * `GET /projects` is itself already RLS-filtered to the caller's own
 * memberships.
 */
export function useAnalyticsProjectsQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: analyticsProjectsQueryKey(),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects");
      if (error) throw error;
      return data;
    },
  });
}

export function analyticsCommitmentsQueryKey(projectIds: string[]) {
  return ["analytics", "commitments", ...projectIds] as const;
}

/**
 * Fans out GET /projects/{id}/commitments (no filters — every commitment,
 * every state) across the given projects and flattens the result.
 * CommitmentOut.project_id lets bucketVerificationBurdenByWeek (lib/
 * analytics/aggregate.ts) group by project without a second join.
 */
export function useAnalyticsCommitmentsQuery(projectIds: string[]) {
  const api = useApiClient();
  return useQuery({
    queryKey: analyticsCommitmentsQueryKey(projectIds),
    queryFn: async () => {
      const results = await Promise.all(
        projectIds.map(async (project_id) => {
          const { data, error } = await api.GET("/projects/{project_id}/commitments", {
            params: { path: { project_id }, query: {} },
          });
          if (error) throw error;
          return data;
        }),
      );
      return results.flat() as CommitmentOut[];
    },
    enabled: projectIds.length > 0,
  });
}

export function analyticsWritebackQueryKey(projectIds: string[]) {
  return ["analytics", "writeback", ...projectIds] as const;
}

/**
 * Fans out GET /projects/{id}/writeback (no commitment_id filter — full
 * project history) across the given projects and flattens the result, for
 * computeWritebackReplyRate.
 */
export function useAnalyticsWritebackQuery(projectIds: string[]) {
  const api = useApiClient();
  return useQuery({
    queryKey: analyticsWritebackQueryKey(projectIds),
    queryFn: async () => {
      const results = await Promise.all(
        projectIds.map(async (project_id) => {
          const { data, error } = await api.GET("/projects/{project_id}/writeback", {
            params: { path: { project_id }, query: {} },
          });
          if (error) throw error;
          return data;
        }),
      );
      return results.flat() as OutboundMessageOut[];
    },
    enabled: projectIds.length > 0,
  });
}

export function costSummaryQueryKey() {
  return ["analytics", "cost-summary"] as const;
}

/**
 * GET /admin/cost-summary with no project_id — org-wide rows, one per
 * (project, provider, model). Real, already-closed groundwork (PRD §13's
 * "cost per active project", NFR-OBS-03) — this hook only reads it back.
 */
export function useCostSummaryQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: costSummaryQueryKey(),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/cost-summary", {
        params: { query: {} },
      });
      if (response.status === 403) {
        throw new CostSummaryPermissionError(
          "administrator role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    retry: (failureCount, err) => !(err instanceof CostSummaryPermissionError) && failureCount < 3,
  });
}

export function projectNameMap(projects: ProjectOut[] | undefined): Map<string, string> {
  return new Map((projects ?? []).map((p) => [p.id, p.name]));
}
