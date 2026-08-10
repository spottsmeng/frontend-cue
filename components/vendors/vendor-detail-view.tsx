"use client";

import { useState } from "react";
import Link from "next/link";

import { VendorPermissionError, useVendorQuery } from "@/lib/vendors/hooks";
import type { VendorSegment } from "@/lib/vendors/hooks";

import { SectionPanel } from "../living-wip/section-panel";
import { MetricHistoryChart } from "./metric-history-chart";
import { OrganisationMappingPanel } from "./organisation-mapping-panel";
import { VendorMetricsPanel } from "./vendor-metrics-panel";

const TYPE_LABEL: Record<string, string> = {
  person: "Person",
  vendor_org: "Vendor",
  internal_staff: "Internal",
};

/**
 * FR-VRG §6.13 WHAT TO BUILD #2/#3/#4: reliability metrics + segment
 * picker, history trend, and the read-only organisation-mapping display —
 * one scrolling page, same "sections as bounded panels" shell every other
 * surface uses (DESIGN.md's layout concept), not three separate routes.
 * `segment` is owned here, not inside either child panel, since the
 * metrics panel's own picker and the history chart's `event_archetype`
 * both need to stay in sync with the same segment.
 */
export function VendorDetailView({ partyId }: { partyId: string }) {
  const { data: party, isLoading, isError, error } = useVendorQuery(partyId);
  const [segment, setSegment] = useState<VendorSegment>({});

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur">
        <Link href="/vendors" className="text-sm text-ink-muted hover:text-signal">
          ← Vendors
        </Link>
        <span className="text-sm font-medium text-ink">{party?.display_name ?? "Vendor"}</span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
        {isError &&
          (error instanceof VendorPermissionError ? (
            <p className="text-sm text-ink-muted">
              This page is Finance/Procurement only. You don&apos;t hold that role on any project in
              this organisation.
            </p>
          ) : (
            <p className="text-sm text-critical">Could not load this party. Please retry.</p>
          ))}

        {party && (
          <>
            <SectionPanel
              title={party.display_name}
              action={
                <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-xs font-medium text-ink-muted">
                  {TYPE_LABEL[party.type] ?? party.type}
                </span>
              }
            >
              <p className="font-mono text-xs text-ink-muted">
                {party.city ?? "no city on file"} · added {party.created_at.slice(0, 10)}
              </p>
            </SectionPanel>

            <SectionPanel title="Reliability metrics">
              <VendorMetricsPanel partyId={partyId} segment={segment} onSegmentChange={setSegment} />
            </SectionPanel>

            <SectionPanel title="History">
              <MetricHistoryChart partyId={partyId} eventArchetype={segment.eventArchetype} />
            </SectionPanel>

            {party.type === "person" && (
              <SectionPanel title="Represents">
                <OrganisationMappingPanel partyId={partyId} />
              </SectionPanel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
