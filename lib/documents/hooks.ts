import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import type {
  DocumentTagRequest,
  DocumentUploadBody,
  DocumentVersionUploadBody,
} from "@/lib/api/types";

// --- Documents: list, detail, lineage, search --------------------------

export function documentsQueryKey(projectId: string) {
  return ["documents", projectId] as const;
}

export function useDocumentsQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: documentsQueryKey(projectId),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/documents", {
        params: { path: { project_id: projectId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * FR-DOC-05: lexical only (Postgres tsvector/GIN) — this milestone's own
 * EXPLICITLY OUT OF SCOPE note against implying semantic matching. `enabled`
 * gates on a non-empty query so an empty search box doesn't fire a request
 * that's equivalent to (and more expensive than) the plain list above.
 */
export function useDocumentSearchQuery(projectId: string, query: string) {
  const api = useApiClient();
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["documents", projectId, "search", trimmed],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/documents/search", {
        params: { path: { project_id: projectId }, query: { q: trimmed } },
      });
      if (error) throw error;
      return data;
    },
    enabled: trimmed.length > 0,
  });
}

export function documentQueryKey(projectId: string, documentId: string) {
  return ["documents", projectId, documentId] as const;
}

export function useDocumentQuery(projectId: string, documentId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: documentQueryKey(projectId, documentId),
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/documents/{document_id}", {
        params: { path: { project_id: projectId, document_id: documentId } },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function documentLineageQueryKey(projectId: string, documentId: string) {
  return ["documents", projectId, documentId, "lineage"] as const;
}

/**
 * FR-DOC-02/04: full version history plus the unambiguous current pointer.
 * Every version's `download_url` is a short-expiry signed URL
 * (StorageBackend.signed_url, NFR-SEC-02) — this milestone's own READ FIRST
 * note asks to confirm, not assume, that F0's default staleTime is short
 * enough to not hand out a stale/expired one. Confirmed: signed URLs expire
 * after 3600s (storage.py's own default); F0's global default staleTime is
 * 60s (lib/query-client.ts) — two orders of magnitude of headroom, so no
 * override is needed here.
 */
export function useDocumentLineageQuery(projectId: string, documentId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: documentLineageQueryKey(projectId, documentId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/projects/{project_id}/documents/{document_id}/lineage",
        { params: { path: { project_id: projectId, document_id: documentId } } },
      );
      if (error) throw error;
      return data;
    },
  });
}

function invalidateDocument(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  documentId: string,
) {
  queryClient.invalidateQueries({ queryKey: documentsQueryKey(projectId) });
  queryClient.invalidateQueries({ queryKey: documentQueryKey(projectId, documentId) });
  queryClient.invalidateQueries({ queryKey: documentLineageQueryKey(projectId, documentId) });
}

// --- Upload / new version -------------------------------------------------

/**
 * openapi-fetch's `defaultBodySerializer` already special-cases
 * `body instanceof FormData` (returns it untouched, skips the
 * `Content-Type` header so the browser sets the multipart boundary itself)
 * — no custom `bodySerializer` is needed, just a real `FormData` where the
 * generated `Body_*` type says `file: string` (openapi-typescript's
 * rendering of a binary upload field, never what's actually sent). This is
 * this session's own judgment call, documented per Prompt F0's convention:
 * F1–F3 had no multipart precedent to follow (frontend/PROGRESS.md's F4
 * notes).
 */
function toFormData(fields: Record<string, string | Blob | null | undefined>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) form.append(key, value);
  }
  return form;
}

export interface UploadDocumentInput {
  file: File;
  name: string;
  classCode?: string;
  language?: string;
  originalText?: string;
  translation?: string;
  extractedText?: string;
}

export function useUploadDocumentMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadDocumentInput) => {
      const body = toFormData({
        file: input.file,
        name: input.name,
        class_code: input.classCode,
        language: input.language || "en",
        original_text: input.originalText,
        translation: input.translation,
        extracted_text: input.extractedText,
      }) as unknown as DocumentUploadBody;
      const { data, error } = await api.POST("/projects/{project_id}/documents", {
        params: { path: { project_id: projectId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsQueryKey(projectId) }),
  });
}

export interface AddVersionInput {
  documentId: string;
  file: File;
  language?: string;
  originalText?: string;
  translation?: string;
  extractedText?: string;
}

export function useAddVersionMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddVersionInput) => {
      const body = toFormData({
        file: input.file,
        language: input.language || "en",
        original_text: input.originalText,
        translation: input.translation,
        extracted_text: input.extractedText,
      }) as unknown as DocumentVersionUploadBody;
      const { data, error } = await api.POST(
        "/projects/{project_id}/documents/{document_id}/versions",
        { params: { path: { project_id: projectId, document_id: input.documentId } }, body },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) => invalidateDocument(queryClient, projectId, input.documentId),
  });
}

// --- Approve / tag ----------------------------------------------------

/**
 * FR-DOC-02/04's approval + FR-DOC-07's write-back trigger, in one call.
 * The response never carries a write-back outcome (`DocumentVersionOut` has
 * no such field — confirmed against app/api/schemas.py directly, a
 * documented response-shape gap in frontend/PROGRESS.md's F4 notes, not
 * fabricated here) — approving must read as unconditionally final in the
 * UI regardless (this milestone's own NON-OBVIOUS note).
 */
export function useApproveVersionMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, versionId }: { documentId: string; versionId: string }) => {
      const { data, error } = await api.POST(
        "/projects/{project_id}/documents/{document_id}/versions/{version_id}/approve",
        { params: { path: { project_id: projectId, document_id: documentId, version_id: versionId } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { documentId }) => invalidateDocument(queryClient, projectId, documentId),
  });
}

export function useTagDocumentMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentId,
      body,
    }: {
      documentId: string;
      body: DocumentTagRequest;
    }) => {
      const { data, error } = await api.POST("/projects/{project_id}/documents/{document_id}/tag", {
        params: { path: { project_id: projectId, document_id: documentId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { documentId }) => invalidateDocument(queryClient, projectId, documentId),
  });
}

// --- Ontology-term pickers (deliverable_class / milestone_type / phase) ---
//
// Each surface owns its own thin, category-scoped query hook rather than a
// shared generic one — mirrors lib/twin/hooks.ts's useMilestoneTypeTermsQuery
// and lib/foresight/hooks.ts's useDeviationClassTermsQuery exactly (this
// milestone's own gap-audit check: `GET .../ontology-terms?category=X` is
// the discovery endpoint every prior milestone used, never a hardcoded
// CUE-PRD.md §4.2 term list).

export function useDeliverableClassTermsQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["ontology-terms", projectId, "deliverable_class"],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/ontology-terms", {
        params: { path: { project_id: projectId }, query: { category: "deliverable_class" } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useDocumentMilestoneTypeTermsQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["ontology-terms", projectId, "milestone_type"],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/ontology-terms", {
        params: { path: { project_id: projectId }, query: { category: "milestone_type" } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function usePhaseTermsQuery(projectId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["ontology-terms", projectId, "phase"],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/ontology-terms", {
        params: { path: { project_id: projectId }, query: { category: "phase" } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/** Mirrors lib/foresight/hooks.ts's resolveTermLabel exactly — see that
 * file's own note on why this is a plain Map-style lookup, never a second
 * request per row, and why an unresolvable id renders as an honest
 * "unknown", not a blank or a thrown error. */
export function resolveTermLabel(
  terms: { id: string; code: string; label_en: string }[] | undefined,
  termId: string,
): { code: string; label_en: string } | null {
  const term = terms?.find((t) => t.id === termId);
  return term ? { code: term.code, label_en: term.label_en } : null;
}

// --- Spec claims --------------------------------------------------------

export function specClaimsQueryKey(projectId: string, documentId: string, versionId: string) {
  return ["documents", projectId, documentId, "versions", versionId, "spec-claims"] as const;
}

export function useSpecClaimsQuery(projectId: string, documentId: string, versionId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: specClaimsQueryKey(projectId, documentId, versionId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/projects/{project_id}/documents/{document_id}/versions/{version_id}/spec-claims",
        { params: { path: { project_id: projectId, document_id: documentId, version_id: versionId } } },
      );
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Resolves a `SpecClaim.contradicts` target — app/foresight/contradiction.py
 * compares claims project-wide by shared deliverable_id/location_code, so
 * the conflicting claim can live on a different document version than the
 * one currently open, which `useSpecClaimsQuery` above never fetches.
 * `GET .../documents/spec-claims/{id}` (this milestone's own backend
 * addition — see backend/PROGRESS.md's frontend-enablement notes) is a
 * single-claim-by-id lookup carrying enough document identity to render and
 * link to it. `enabled` gates on a real id so a claim with no `contradicts`
 * never fires a request for `undefined`.
 */
export function useResolveSpecClaimQuery(projectId: string, specClaimId: string | null | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["documents", projectId, "spec-claims", specClaimId],
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/projects/{project_id}/documents/spec-claims/{spec_claim_id}",
        { params: { path: { project_id: projectId, spec_claim_id: specClaimId as string } } },
      );
      if (error) throw error;
      return data;
    },
    enabled: Boolean(specClaimId),
    staleTime: 5 * 60_000,
  });
}
