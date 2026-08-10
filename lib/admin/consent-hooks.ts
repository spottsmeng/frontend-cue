import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { AdminPermissionError } from "@/lib/admin/members-hooks";
import type { ConsentStatus } from "@/lib/api/types";
import { triggerBlobDownload } from "@/lib/admin/download";

/**
 * `ConsentRecord` is one current row per (party, project) — an upsert, not
 * an append-only log (Prompt F7's own NON-OBVIOUS note: "only the current
 * status is ever actually acted on"). This is a current-status view, never
 * a fabricated history timeline the API can't back.
 */
export function consentQueryKey(filters: { projectId?: string; status?: ConsentStatus }) {
  return ["admin", "consent", filters] as const;
}

export function useConsentQuery(filters: { projectId?: string; status?: ConsentStatus } = {}) {
  const api = useApiClient();
  return useQuery({
    queryKey: consentQueryKey(filters),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/admin/consent", {
        params: {
          query: {
            project_id: filters.projectId ?? null,
            party_id: null,
            status: filters.status ?? null,
          },
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

/** FR-ADM-07's "action data-subject requests" — records or updates a
 * party's consent status against the ledger, upsert-by-(party_id,
 * project_id). */
export function useConsentActionMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      party_id: string;
      status: ConsentStatus;
      evidence?: string | null;
      notice_sent_at?: string | null;
    }) => {
      const { data, error } = await api.POST("/admin/consent/action-request", {
        body: { ...body, project_id: projectId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "consent"] }),
  });
}

/** FR-ADM-07's export verb — a real file download (csv is a plain text/csv
 * body here, unlike the project export's zip), not a JSON preview. Uses
 * openapi-fetch's own `parseAs: "blob"` so the response is never forced
 * through JSON parsing regardless of format. */
export function useExportConsentMutation() {
  const api = useApiClient();
  return useMutation({
    mutationFn: async (args: {
      format: "json" | "csv";
      projectId?: string;
      status?: ConsentStatus;
    }) => {
      const { data, response } = await api.GET("/admin/consent/export", {
        params: {
          query: {
            project_id: args.projectId ?? null,
            party_id: null,
            status: args.status ?? null,
            format: args.format,
          },
        },
        parseAs: "blob",
      });
      if (!response.ok || !data) throw new Error(`export failed (${response.status})`);
      triggerBlobDownload(data as Blob, `consent_records.${args.format}`);
    },
  });
}
