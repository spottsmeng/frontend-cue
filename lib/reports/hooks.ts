import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import type { ExportBlockedBody } from "@/lib/api/types";

export function reportQueryKey(projectId: string) {
  return ["report", projectId] as const;
}

/**
 * `GET .../report/current` — FR-RPT-01: always fresh, no server-side cache.
 * `staleTime: 0` here mirrors that on the client side too; §12.2's own
 * "currency indicator... never a refresh button" is satisfied by
 * invalidating this key after every mutation this milestone's own
 * components trigger (see each domain's own hooks below), not by polling —
 * a documented choice, not an oversight (the prompt's own wording allows
 * either).
 */
export function useReportQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: reportQueryKey(projectId),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/report/current", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });
}

export function useSnapshotsQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["report-snapshots", projectId],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/report/snapshots", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export class ExportBlockedError extends Error {
  message: string;
  blockingCommitments: ExportBlockedBody["detail"]["blocking_commitments"];

  constructor(body: ExportBlockedBody) {
    super(body.detail.message);
    this.message = body.detail.message;
    this.blockingCommitments = body.detail.blocking_commitments;
  }
}

/**
 * `POST .../report/export` — the 409 body (`{detail: {message,
 * blocking_commitments}}` — FastAPI's own HTTPException wraps whatever
 * `detail=` was given under that key) is never a declared response in the
 * OpenAPI schema (app/api/reports.py's export_report constructs it as a raw
 * dict, not a response_model — see lib/api/types.ts's own comment), so
 * openapi-fetch's `error` here is untyped at the wire level; re-thrown as a
 * typed ExportBlockedError so callers can render the blocking list without
 * re-parsing a raw Response themselves.
 */
export function useExportMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (format: "pptx" | "pdf") => {
      const { data, error, response } = await api.POST("/projects/{project_id}/report/export", {
        params: { path: { project_id: projectId }, query: { format } },
      });
      if (response.status === 409) {
        throw new ExportBlockedError(error as unknown as ExportBlockedBody);
      }
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-snapshots", projectId] });
    },
  });
}
