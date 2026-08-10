"use client";

import { useState } from "react";

import { AdminPermissionError } from "@/lib/admin/members-hooks";
import {
  useChannelIdentitiesQuery,
  useOverrideChannelIdentityMutation,
} from "@/lib/admin/identities-hooks";
import { useVendorListQuery } from "@/lib/vendors/hooks";
import { formatDateTime } from "@/lib/format";

import { SectionPanel } from "../living-wip/section-panel";

/**
 * FR-NRM-03: `GET /admin/channel-identities` review queue +
 * `POST .../override` correction. Defaults to `max_confidence=0.7` — an
 * Administrator reviewing low-confidence auto-resolutions, not a dump of
 * every resolved identity in the organisation (Prompt F7's own NON-OBVIOUS
 * note). The party picker reuses `lib/vendors/hooks.ts`'s
 * `useVendorListQuery` directly (F6's own hook, unmodified) — `GET
 * /parties` now accepts an administrator too (backend/PROGRESS.md's "round
 * 7"), the same gate this whole screen already runs at.
 */
export function ChannelIdentitiesView() {
  const { data: identities, isLoading, isError, error } = useChannelIdentitiesQuery({
    maxConfidence: 0.7,
  });
  const { data: parties } = useVendorListQuery({});
  const overrideMutation = useOverrideChannelIdentityMutation();

  const [overrideParty, setOverrideParty] = useState<Record<string, string>>({});

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel title="Channel identity overrides">
        <p className="mb-3 text-xs text-ink-muted">
          Auto-resolved (channel_type, external_id) → party mappings at or below 70% confidence —
          correct a misresolved party here (FR-NRM-03).
        </p>
        {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
        {isError &&
          (error instanceof AdminPermissionError ? (
            <p className="text-sm text-ink-muted">
              This page is Administrator only. You don&apos;t hold that role on any project in this
              organisation.
            </p>
          ) : (
            <p className="text-sm text-critical">Could not load channel identities. Please retry.</p>
          ))}
        {identities && identities.length === 0 && (
          <p className="text-sm text-ink-muted">
            No low-confidence or unverified identity resolutions to review right now.
          </p>
        )}
        {identities && identities.length > 0 && (
          <ul className="flex flex-col gap-2">
            {identities.map((id) => (
              <li key={id.id} className="rounded-md border border-border p-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-ink">
                    {id.channel_type} · {id.external_id}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning">
                      confidence {(id.confidence * 100).toFixed(0)}%
                    </span>
                    {id.manually_verified && (
                      <span className="rounded-full bg-signal-soft px-2 py-0.5 text-xs text-signal">
                        manually verified
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  currently resolved to party {id.party_id} · updated {formatDateTime(id.updated_at)}
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="text-xs text-ink-secondary">
                    Correct party
                    <select
                      value={overrideParty[id.id] ?? ""}
                      onChange={(e) => setOverrideParty({ ...overrideParty, [id.id]: e.target.value })}
                      className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
                    >
                      <option value="">Select a party…</option>
                      {parties?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.display_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={!overrideParty[id.id] || overrideMutation.isPending}
                    onClick={() =>
                      overrideMutation.mutate({
                        channel_type: id.channel_type,
                        external_id: id.external_id,
                        party_id: overrideParty[id.id]!,
                      })
                    }
                    className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Override
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    </div>
  );
}
