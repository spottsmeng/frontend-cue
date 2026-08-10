"use client";

import { useState } from "react";

import { AdminPermissionError } from "@/lib/admin/members-hooks";
import {
  useConsentActionMutation,
  useConsentQuery,
  useExportConsentMutation,
} from "@/lib/admin/consent-hooks";
import { CONSENT_STATUSES, CONSENT_STATUS_LABEL } from "@/lib/admin/constants";
import { useVendorListQuery } from "@/lib/vendors/hooks";
import { formatDateTime } from "@/lib/format";
import type { ConsentStatus } from "@/lib/api/types";

import { SectionPanel } from "../living-wip/section-panel";

/**
 * WHAT TO BUILD #6: current-status view + action-request + export, per
 * project. `ConsentRecord` is one current row per (party, project), an
 * upsert, not an append-only log (Prompt F7's own NON-OBVIOUS note) — this
 * is a status view, never a fabricated history timeline the API can't
 * back.
 */
export function ProjectConsentView({ projectId }: { projectId: string }) {
  const { data: records, isLoading, isError, error } = useConsentQuery({ projectId });
  const { data: parties } = useVendorListQuery({});
  const actionMutation = useConsentActionMutation(projectId);
  const exportMutation = useExportConsentMutation();

  const [partyId, setPartyId] = useState("");
  const [status, setStatus] = useState<ConsentStatus>("accepted");
  const [evidence, setEvidence] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel
        title="Consent"
        action={
          <span className="flex gap-2">
            <button
              type="button"
              disabled={exportMutation.isPending}
              onClick={() => exportMutation.mutate({ format: "json", projectId })}
              className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
            >
              Export JSON
            </button>
            <button
              type="button"
              disabled={exportMutation.isPending}
              onClick={() => exportMutation.mutate({ format: "csv", projectId })}
              className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
            >
              Export CSV
            </button>
          </span>
        }
      >
        {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
        {isError &&
          (error instanceof AdminPermissionError ? (
            <p className="text-sm text-ink-muted">
              This page is Administrator only. You don&apos;t hold that role on any project in this
              organisation.
            </p>
          ) : (
            <p className="text-sm text-critical">Could not load consent records. Please retry.</p>
          ))}
        {records && records.length === 0 && (
          <p className="mb-3 text-sm text-ink-muted">No consent records for this project yet.</p>
        )}
        {records && records.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1.5">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-ink">party {r.party_id}</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-xs text-ink-secondary">
                    {CONSENT_STATUS_LABEL[r.status]}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    updated {formatDateTime(r.updated_at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {exportMutation.isError && (
          <p className="mb-2 text-xs text-critical">Export failed — please retry.</p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!partyId) return;
            actionMutation.mutate(
              { party_id: partyId, status, evidence: evidence || null },
              { onSuccess: () => setEvidence("") },
            );
          }}
          className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
        >
          <label className="text-xs text-ink-secondary">
            Party
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
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
          <label className="text-xs text-ink-secondary">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ConsentStatus)}
              className="mt-1 block w-40 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            >
              {CONSENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CONSENT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-secondary">
            Evidence (optional)
            <input
              type="text"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="e.g. link to the notice/response"
              className="mt-1 block w-64 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={!partyId || actionMutation.isPending}
            className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Record
          </button>
          {actionMutation.isError && (
            <p className="w-full text-xs text-critical">Could not record consent — please retry.</p>
          )}
        </form>
      </SectionPanel>
    </div>
  );
}
