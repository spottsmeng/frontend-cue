import { useMutation } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { triggerBlobDownload } from "@/lib/admin/download";

/**
 * `GET /admin/export/{project_id}?format=json|csv` — FR-ADM-10's full
 * project record (ledger, budgets, audit; documents are a real, named,
 * currently-open gap on the backend side per its own docstring, not
 * something this screen routes around). `csv` returns a zip of per-table
 * CSVs, a real file, not a JSON preview (Prompt F7's own NON-OBVIOUS note)
 * — both formats go through the same authenticated blob download
 * `lib/admin/consent-hooks.ts`'s export mutation already established.
 */
export function useExportProjectMutation() {
  const api = useApiClient();
  return useMutation({
    mutationFn: async (args: { projectId: string; format: "json" | "csv" }) => {
      const { data, response } = await api.GET("/admin/export/{project_id}", {
        params: { path: { project_id: args.projectId }, query: { format: args.format } },
        parseAs: "blob",
      });
      if (!response.ok || !data) throw new Error(`export failed (${response.status})`);
      const extension = args.format === "csv" ? "zip" : "json";
      triggerBlobDownload(data as Blob, `project_${args.projectId}_export.${extension}`);
    },
  });
}
