"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { useResolveSpecClaimQuery, useSpecClaimsQuery } from "@/lib/documents/hooks";
import type { SpecClaimOut } from "@/lib/api/types";

import { EvidenceViewer } from "../living-wip/evidence-viewer";

/**
 * FR-DOC-08: structured spec-claim extraction (Annex A's Location ·
 * Description(attribute) · Dimension/Finishing/Qty/Status shape) for one
 * document version. `contradicts` is rendered as a real link between the
 * two conflicting claims (this milestone's own NON-OBVIOUS note — never a
 * flat list with an opaque UUID).
 */
export function SpecClaimsPanel({
  projectId,
  documentId,
  versionId,
}: {
  projectId: string;
  documentId: string;
  versionId: string;
}) {
  const t = useTranslations("documents.specClaims");
  const { data: claims, isLoading, isError } = useSpecClaimsQuery(projectId, documentId, versionId);

  if (isLoading) return <p className="text-xs text-ink-muted">{t("loading")}</p>;
  if (isError) return <p className="text-xs text-critical">{t("loadError")}</p>;
  if (!claims || claims.length === 0) {
    return <p className="text-xs text-ink-muted">{t("empty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {claims.map((claim) => (
        <SpecClaimRow key={claim.id} projectId={projectId} claim={claim} />
      ))}
    </ul>
  );
}

function SpecClaimRow({ projectId, claim }: { projectId: string; claim: SpecClaimOut }) {
  return (
    <li className="rounded-md border border-border-strong bg-surface-sunk p-2.5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {claim.location_code && (
          <span className="font-mono text-ink-muted">{claim.location_code}</span>
        )}
        <span className="rounded-full bg-dusk-soft px-2 py-0.5 text-dusk">{claim.attribute}</span>
        <span className="font-mono text-ink">{claim.value}</span>
      </div>

      {claim.contradicts && <ContradictsLink projectId={projectId} claimId={claim.contradicts} />}

      <div className="mt-1.5">
        <EvidenceViewer evidence={claim.evidence} />
      </div>
    </li>
  );
}

function ContradictsLink({ projectId, claimId }: { projectId: string; claimId: string }) {
  const t = useTranslations("documents.specClaims");
  const { data: target, isLoading, isError } = useResolveSpecClaimQuery(projectId, claimId);

  if (isLoading) {
    return <p className="mt-1.5 text-xs text-ink-muted">{t("resolvingConflict")}</p>;
  }
  if (isError || !target) {
    return <p className="mt-1.5 text-xs text-critical">{t("unresolvableConflict")}</p>;
  }

  return (
    <p className="mt-1.5 rounded-md bg-critical-soft px-2 py-1.5 text-xs text-critical">
      {t("conflictsWith")} {target.attribute} = <span className="font-mono">{target.value}</span>
      {target.location_code && (
        <>
          {" "}
          {t("at")} {target.location_code}
        </>
      )}{" "}
      {t("from")}{" "}
      <Link
        href={`/projects/${projectId}/documents/${target.document_id}`}
        className="underline hover:no-underline"
      >
        {target.document_name} (v{target.document_version_no})
      </Link>
    </p>
  );
}
