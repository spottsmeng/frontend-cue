"use client";

import { useTranslations } from "next-intl";

import { useSupersessionCandidatesQuery } from "@/lib/commitments/hooks";
import type { MembershipRole } from "@/lib/api/types";

import { EmptyState } from "./empty-state";
import { SectionPanel } from "./section-panel";
import { SupersessionCandidateRow } from "./supersession-candidate-row";

/**
 * FR-LED-05: the AI-proposes/human-confirms review queue this milestone
 * closes the "revision_churn/price_drift_pct always unavailable" gap with
 * (see app/ledger/supersession.py's own module docstring — the Vendor
 * Reliability Graph, F6, honestly surfaced this gap rather than working
 * around it; this panel is what actually closes it).
 *
 * Fetches every status, not just `pending` — a real UX bug this session's
 * own e2e test caught: filtering to `pending` server-side means confirming
 * a candidate immediately drops it out of the refetched list the instant
 * `useConfirmSupersessionCandidateMutation`'s own `onSuccess` invalidates
 * the query, so the row a reviewer just acted on silently vanishes instead
 * of showing the real "Confirmed" outcome — indistinguishable from the
 * click not having registered at all. `SupersessionCandidateRow` already
 * renders a real, distinct state for `confirmed`/`rejected`; grouping into
 * "Needs review" / "Recently reviewed" (same two-group shape
 * ThresholdConfigPanel's own "organisation-wide" / "this project's
 * overrides" split already establishes) is what actually uses it.
 */
export function SupersessionReviewPanel({
  projectId,
  effectiveRoles,
}: {
  projectId: string;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const t = useTranslations("livingWip.supersessionReview");
  const { data: candidates, isLoading, isError } = useSupersessionCandidatesQuery(projectId);

  const pending = (candidates ?? []).filter((c) => c.status === "pending");
  const reviewed = (candidates ?? []).filter((c) => c.status !== "pending");

  return (
    <SectionPanel title={t("title")}>
      {isLoading && <p className="text-sm text-ink-muted">{t("loading")}</p>}
      {isError && <p className="text-sm text-critical">{t("loadError")}</p>}
      {candidates && candidates.length === 0 && <EmptyState message={t("empty")} />}

      {pending.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">{t("needsReview")}</p>
          <ul className="flex flex-col gap-2">
            {pending.map((candidate) => (
              <SupersessionCandidateRow
                key={candidate.id}
                projectId={projectId}
                candidate={candidate}
                effectiveRoles={effectiveRoles}
              />
            ))}
          </ul>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">
            {t("recentlyReviewed")}
          </p>
          <ul className="flex flex-col gap-2">
            {reviewed.map((candidate) => (
              <SupersessionCandidateRow
                key={candidate.id}
                projectId={projectId}
                candidate={candidate}
                effectiveRoles={effectiveRoles}
              />
            ))}
          </ul>
        </div>
      )}
    </SectionPanel>
  );
}
