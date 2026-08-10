import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import { reportQueryKey } from "@/lib/reports/hooks";
import type { CommitmentCorrection, CommitmentSupersessionCandidateStatus } from "@/lib/api/types";

export function commitmentQueryKey(projectId: string, commitmentId: string) {
  return ["commitment", projectId, commitmentId] as const;
}

export function useCommitmentQuery(projectId: string, commitmentId: string | null) {
  const api = useApiClient();
  return useQuery({
    queryKey: commitmentId ? commitmentQueryKey(projectId, commitmentId) : ["commitment", "none"],
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/projects/{project_id}/commitments/{commitment_id}",
        { params: { path: { project_id: projectId, commitment_id: commitmentId! } } },
      );
      if (error) throw error;
      return data;
    },
    enabled: commitmentId !== null,
  });
}

/**
 * FR-LED-08's "correct if needed" + "confirm" as one call — `corrections`
 * omitted (or every field unset) is a plain confirm; any field set is a
 * correction, and the API itself decides human_verified vs.
 * human_corrected from that, not this hook.
 */
export function useVerifyCommitmentMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commitmentId,
      corrections,
    }: {
      commitmentId: string;
      corrections?: CommitmentCorrection;
    }) => {
      const { data, error } = await api.POST(
        "/projects/{project_id}/commitments/{commitment_id}/verify",
        {
          params: { path: { project_id: projectId, commitment_id: commitmentId } },
          body: { corrections: corrections ?? null },
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reportQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: commitmentQueryKey(projectId, data.id) });
    },
  });
}

// --- FR-LED-05: supersession candidates (app/ledger/supersession.py) ------
//
// AI-proposed, human-confirmed — see that module's own docstring. The
// response shape carries plain commitment ids only (this API's own
// "resolve against an already-fetched list client-side" discipline,
// CommitmentSupersessionCandidateOut's own docstring) — SupersessionReview
// resolves each side via useCommitmentQuery above rather than this file
// duplicating commitment display data.

export function supersessionCandidatesQueryKey(
  projectId: string,
  status: CommitmentSupersessionCandidateStatus | undefined,
) {
  return ["supersession-candidates", projectId, status] as const;
}

export function useSupersessionCandidatesQuery(
  projectId: string,
  status?: CommitmentSupersessionCandidateStatus,
) {
  const api = useApiClient();
  return useQuery({
    queryKey: supersessionCandidatesQueryKey(projectId, status),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/projects/{project_id}/commitments/supersession-candidates",
        { params: { path: { project_id: projectId }, query: { status: status ?? null } } },
      );
      if (error) throw error;
      return data;
    },
  });
}

function invalidateSupersessionCandidates(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  queryClient.invalidateQueries({ queryKey: ["supersession-candidates", projectId] });
}

export function useConfirmSupersessionCandidateMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: string) => {
      const { data, error } = await api.POST(
        "/projects/{project_id}/commitments/supersession-candidates/{candidate_id}/confirm",
        { params: { path: { project_id: projectId, candidate_id: candidateId } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateSupersessionCandidates(queryClient, projectId),
  });
}

export function useRejectSupersessionCandidateMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: string) => {
      const { data, error } = await api.POST(
        "/projects/{project_id}/commitments/supersession-candidates/{candidate_id}/reject",
        { params: { path: { project_id: projectId, candidate_id: candidateId } } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateSupersessionCandidates(queryClient, projectId),
  });
}

/**
 * FR-LED-13: Finance/Producer-only — the API independently enforces this
 * (require_project_role(*FINANCE_ROLES)); the caller is expected to have
 * already checked lib/roles.ts's useEffectiveRoles before rendering the
 * control that invokes this, per F0's "UX nicety, not a security boundary"
 * position.
 */
export function usePaymentStatusMutation(projectId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commitmentId,
      paymentStatus,
    }: {
      commitmentId: string;
      paymentStatus: "unpaid" | "invoiced" | "paid";
    }) => {
      const { data, error } = await api.PATCH(
        "/projects/{project_id}/commitments/{commitment_id}/payment-status",
        {
          params: { path: { project_id: projectId, commitment_id: commitmentId } },
          body: { payment_status: paymentStatus },
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reportQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: commitmentQueryKey(projectId, data.id) });
    },
  });
}
