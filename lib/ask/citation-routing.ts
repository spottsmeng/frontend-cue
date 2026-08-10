import type { CitationSourceType } from "@/lib/api/types";

/**
 * §12.5: "every citation opens the source" — routed to whichever existing
 * detail view a milestone before this one already built (commitment ->
 * F1's own drawer; deviation -> F3's Foresight page; document_version ->
 * F4's document detail page, once resolved to its parent document_id), per
 * this milestone's own explicit instruction not to build six new bespoke
 * detail renderers here.
 *
 * `document_version` needs a network round trip (only the version's own id
 * is on the wire — see `_resolve_citation` in app/ask/answer.py; the parent
 * document_id isn't) — modelled as its own `kind` so a component can render
 * a loading state around the resolve rather than this function pretending
 * to be synchronous when it can't be.
 *
 * `budget` and `deviation` land on the *surface* that owns that data, not a
 * specific open row within it — Living WIP's budget summary and Foresight's
 * deviation list have no per-row drawer of their own to deep-link into
 * (F3's own notes: "plain navigation, not a query-param deep link"), so
 * landing on the right page is the honest, real link this milestone's own
 * fallback allowance describes, not a dead one.
 *
 * `audit_log` and `evidence` are the two source types with no real
 * destination at all, for different reasons — both return `unavailable`
 * rather than a link the app can't actually back:
 * - `audit_log`: `Citation.label` is always null for this type and
 *   `AuditLog.actor_id` has no resolver anywhere in the API (confirmed by
 *   reading app/ask/answer.py's `_resolve_citation` directly, not assumed —
 *   this milestone's own NON-OBVIOUS note). Even setting the actor aside,
 *   the Citation carries only the audit_log row's own id, never the
 *   commitment_id it's about, and no endpoint resolves one to the other —
 *   a real, named backend gap, flagged in frontend/PROGRESS.md rather than
 *   routed around by parsing `snippet` for a name.
 * - `evidence`: never actually appears on the wire in practice —
 *   `_resolve_citation` always resolves an evidence hit one level further,
 *   to whichever of commitment/budget/document_version/deviation it
 *   belongs to — but the schema still declares it as a legal
 *   `CitationSourceTypeLiteral` value, so it's handled explicitly here too
 *   rather than left to fall through unhandled.
 */
export type CitationRoute =
  | { kind: "commitment"; commitmentId: string }
  | { kind: "link"; href: string; label: string }
  | { kind: "resolve-document-version"; versionId: string }
  | { kind: "unavailable"; reason: string };

export function routeCitation(
  projectId: string,
  citation: { source_type: CitationSourceType; source_id: string },
): CitationRoute {
  switch (citation.source_type) {
    case "commitment":
      return { kind: "commitment", commitmentId: citation.source_id };
    case "budget":
      return { kind: "link", href: `/projects/${projectId}`, label: "View budget in Living WIP" };
    case "deviation":
      return { kind: "link", href: `/projects/${projectId}/foresight`, label: "View in Foresight" };
    case "document_version":
      return { kind: "resolve-document-version", versionId: citation.source_id };
    case "audit_log":
      return {
        kind: "unavailable",
        reason:
          "This decision-log entry has no detail view yet, and its actor can't be resolved to a name — a known backend gap (frontend/PROGRESS.md's F5 notes).",
      };
    case "evidence":
      return {
        kind: "unavailable",
        reason:
          "This source has no standalone view of its own — it always resolves to the commitment, budget, document or deviation it belongs to.",
      };
    default: {
      const exhaustive: never = citation.source_type;
      throw new Error(`unhandled citation source_type: ${exhaustive}`);
    }
  }
}
