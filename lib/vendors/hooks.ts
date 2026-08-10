import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "@/lib/api/browser";
import type { PartyType, VendorMetricName } from "@/lib/api/types";

/**
 * `require_org_finance`'s 403 ("finance/procurement role required on at
 * least one project in this organisation", app/api/deps.py) — every read
 * this file makes except the organisation-mapping ones below is gated on
 * it. Expected for a project_manager-only viewer who navigates here
 * directly (F0's own "hide the nav entry, but the real gate is the
 * backend's 403" position) — carried as a typed error, same
 * `response.status === 403` detection lib/foresight/hooks.ts's
 * ForesightPermissionError already established, so this panel can render
 * an explainable message instead of a generic failure.
 */
export class VendorPermissionError extends Error {}

/**
 * `require_org_finance_or_administrator`'s 403 — `GET /parties/{id}/
 * organisation` (app/api/parties.py's organisation_router). Originally
 * `require_org_administrator` alone, a real, live gate mismatch F6's own
 * gap-audit found (a Finance/Producer user who can see every other section
 * of a vendor's detail page would 403 here specifically) — closed on the
 * spot in a later session (backend/PROGRESS.md's "round 6"): the two GET
 * operations now accept Finance/Producer *or* administrator, the write
 * stays administrator-only. Kept as its own typed error regardless (not
 * merged into VendorPermissionError above) since a caller holding neither
 * tier is still a real, reachable case worth an explainable message.
 */
export class VendorOrganisationPermissionError extends Error {}

// --- Vendor directory (GET /parties) ---------------------------------------

export interface VendorListFilters {
  type?: PartyType;
  city?: string;
  vendorCategory?: string;
}

export function vendorListQueryKey(filters: VendorListFilters) {
  return ["parties", filters] as const;
}

/**
 * Server-side filtering (app/api/parties.py's list_parties takes
 * type/city/vendor_category as real query params) — not fetched-then-
 * filtered client-side the way lib/documents/hooks.ts's class filter
 * documents it has to be, since that endpoint genuinely has no server
 * filter and this one does.
 */
export function useVendorListQuery(filters: VendorListFilters) {
  const api = useApiClient();
  return useQuery({
    queryKey: vendorListQueryKey(filters),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/parties", {
        params: {
          query: {
            type: filters.type ?? null,
            city: filters.city || null,
            vendor_category: filters.vendorCategory || null,
          },
        },
      });
      if (response.status === 403) {
        throw new VendorPermissionError(
          "finance/procurement role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    retry: (failureCount, err) => !(err instanceof VendorPermissionError) && failureCount < 3,
  });
}

export function vendorQueryKey(partyId: string) {
  return ["parties", partyId] as const;
}

/**
 * `GET /parties/{party_id}` — a frontend-enablement addition this
 * milestone made on the spot (backend/PROGRESS.md's frontend-enablement
 * notes): a vendor detail page needs this party's own display_name/type/
 * city to render a header and to decide whether the person-only
 * organisation-mapping section applies, and no endpoint returned a single
 * Party by id before this one — only the org-wide list above. Same
 * require_org_finance gate, same org-scoped 404-not-leak-existence shape
 * every other route in this module already uses.
 */
export function useVendorQuery(partyId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: vendorQueryKey(partyId),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/parties/{party_id}", {
        params: { path: { party_id: partyId } },
      });
      if (response.status === 403) {
        throw new VendorPermissionError(
          "finance/procurement role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    retry: (failureCount, err) => !(err instanceof VendorPermissionError) && failureCount < 3,
  });
}

// --- Vendor reliability (current segment + history) -------------------------

export interface VendorSegment {
  eventArchetype?: string;
  vendorCategory?: string;
  city?: string;
}

export function vendorReliabilityQueryKey(partyId: string, segment: VendorSegment) {
  return ["parties", partyId, "reliability", segment] as const;
}

export function useVendorReliabilityQuery(partyId: string, segment: VendorSegment) {
  const api = useApiClient();
  return useQuery({
    queryKey: vendorReliabilityQueryKey(partyId, segment),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/parties/{party_id}/reliability", {
        params: {
          path: { party_id: partyId },
          query: {
            event_archetype: segment.eventArchetype || null,
            vendor_category: segment.vendorCategory || null,
            city: segment.city || null,
          },
        },
      });
      if (response.status === 403) {
        throw new VendorPermissionError(
          "finance/procurement role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    retry: (failureCount, err) => !(err instanceof VendorPermissionError) && failureCount < 3,
  });
}

export function vendorReliabilityHistoryQueryKey(
  partyId: string,
  metric: VendorMetricName,
  eventArchetype: string | undefined,
) {
  return ["parties", partyId, "reliability", "history", metric, eventArchetype] as const;
}

/**
 * FR-VRG-03's trend view — every VendorMetric snapshot ever written for
 * this vendor/segment/metric, oldest first (already server-sorted,
 * app/parties/reliability.py's get_reliability_history). One metric at a
 * time, per this endpoint's own `metric` query param — the panel picks
 * which metric's trend to chart, not all five overlaid.
 */
export function useVendorReliabilityHistoryQuery(
  partyId: string,
  metric: VendorMetricName,
  eventArchetype: string | undefined,
) {
  const api = useApiClient();
  return useQuery({
    queryKey: vendorReliabilityHistoryQueryKey(partyId, metric, eventArchetype),
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/parties/{party_id}/reliability/history",
        {
          params: {
            path: { party_id: partyId },
            query: { metric, event_archetype: eventArchetype || null },
          },
        },
      );
      if (response.status === 403) {
        throw new VendorPermissionError(
          "finance/procurement role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    retry: (failureCount, err) => !(err instanceof VendorPermissionError) && failureCount < 3,
  });
}

// --- Party-organisation mapping (FR-NRM-04, read-only this session) --------

export function vendorOrganisationHistoryQueryKey(partyId: string) {
  return ["parties", partyId, "organisation"] as const;
}

/**
 * Read-only this session (the write side, `POST .../organisation`, is an
 * FR-ADM/roster-management action, better placed alongside F7's Admin
 * console — per this milestone's own EXPLICITLY OUT OF SCOPE note). Only
 * meaningful for a `type: "person"` party (FR-NRM-04: person -> vendor
 * company) — the API doesn't reject a `vendor_org`/`internal_staff` party
 * id here, it just returns an honestly empty list, so the panel itself
 * decides when to render this section at all.
 */
export function useVendorOrganisationHistoryQuery(partyId: string, enabled: boolean) {
  const api = useApiClient();
  return useQuery({
    queryKey: vendorOrganisationHistoryQueryKey(partyId),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/parties/{party_id}/organisation", {
        params: { path: { party_id: partyId } },
      });
      if (response.status === 403) {
        throw new VendorOrganisationPermissionError(
          "administrator role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    enabled,
    retry: (failureCount, err) =>
      !(err instanceof VendorOrganisationPermissionError) && failureCount < 3,
  });
}

/**
 * FR-NRM-04's write path — `POST /parties/{id}/organisation`
 * (`require_org_administrator`-only, unchanged by round 6's read-gate
 * widening). Added during F7's Admin console per that milestone's own
 * cross-milestone note ("add the write control to whatever detail view F6
 * built"), landing here rather than a new component, so the vendor detail
 * page's existing history list and its own write control invalidate the
 * exact same query.
 */
export class VendorOrganisationWritePermissionError extends Error {}

export function useSetOrganisationMutation(personPartyId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      organisation_party_id: string;
      role_title?: string | null;
      effective_from?: string | null;
    }) => {
      const { data, error, response } = await api.POST("/parties/{party_id}/organisation", {
        params: { path: { party_id: personPartyId } },
        body,
      });
      if (response.status === 403) {
        throw new VendorOrganisationWritePermissionError(
          "administrator role required on at least one project in this organisation",
        );
      }
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: vendorOrganisationHistoryQueryKey(personPartyId) }),
  });
}

// --- Reference data for the segment picker ----------------------------------

/**
 * `GET /projects` — this org-scoped surface has no `projectId` of its own
 * (READ FIRST note: Party lives at the organisation level), but ontology-
 * term discovery (`vendor_category`) and `Project.archetype_code` (the
 * `event_archetype` segmentation axis) are both still project-scoped
 * endpoints/fields. Any project in the org resolves the same term set
 * (this milestone's own READ FIRST note); picking the first one back is a
 * one-off judgment call, not a "current project" concept this org-scoped
 * surface otherwise has no notion of.
 */
export function useProjectsQuery() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * `GET .../ontology-terms?category=vendor_category` — same discovery
 * endpoint every prior milestone's own thin, category-scoped hook uses
 * (lib/twin/hooks.ts's useMilestoneTypeTermsQuery, lib/foresight/hooks.ts's
 * useDeviationClassTermsQuery, lib/documents/hooks.ts's three) — this
 * milestone's own copy, not imported cross-surface, per F4's documented
 * per-surface-owns-its-hook convention.
 */
export function useVendorCategoryTermsQuery(projectId: string | undefined) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["ontology-terms", projectId, "vendor_category"],
    queryFn: async () => {
      const { data, error } = await api.GET("/projects/{project_id}/ontology-terms", {
        params: { path: { project_id: projectId as string }, query: { category: "vendor_category" } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(projectId),
    staleTime: 5 * 60_000,
  });
}

/** Mirrors lib/foresight/hooks.ts's resolveTermLabel / lib/documents/hooks.ts's
 * copy exactly — a plain Map-style lookup, never a second request per row,
 * `null` (never a guess) for an id the fetched set doesn't contain. */
export function resolveTermLabel(
  terms: { id: string; code: string; label_en: string }[] | undefined,
  termId: string,
): { code: string; label_en: string } | null {
  const term = terms?.find((t) => t.id === termId);
  return term ? { code: term.code, label_en: term.label_en } : null;
}

/**
 * `event_archetype` has no discovery endpoint of its own — unlike
 * `vendor_category` (an ontology_terms vocabulary), `Project.archetype_code`
 * is free text with no `GET .../ontology-terms?category=event_archetype`
 * equivalent (confirmed by reading app/models/project.py directly: a plain
 * nullable string column, not an ontology_terms FK — this milestone's own
 * gap-audit finding, documented in frontend/PROGRESS.md's F6 notes rather
 * than a fabricated dropdown). The honest, real-data option set this
 * surface can offer: every distinct `archetype_code` actually in use across
 * the org's own projects (already fetched via useProjectsQuery for the
 * vendor_category resolution above) — real values that exist, never an
 * invented list, even though it isn't narrowed to values this *specific*
 * vendor has commitments under (VendorMetric.segment_event_archetype only
 * reveals that per already-computed row, which the "current" endpoint
 * doesn't expose a distinct-values query for either).
 */
export function distinctArchetypeCodes(
  projects: { archetype_code: string | null }[] | undefined,
): string[] {
  const codes = new Set((projects ?? []).map((p) => p.archetype_code).filter((c) => c !== null));
  return [...codes].sort();
}
