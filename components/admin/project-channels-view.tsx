"use client";

import { useState } from "react";

import {
  useAttachChannelMutation,
  useChannelHealthHistoryQuery,
  useChannelTypesQuery,
  useChannelsQuery,
  useDetachChannelMutation,
  useReconnectChannelMutation,
} from "@/lib/admin/channels-hooks";
import { formatDateTime } from "@/lib/format";

import { SectionPanel } from "../living-wip/section-panel";

/**
 * WHAT TO BUILD #4: list/attach/detach, health history, reconnect, per
 * project. `type` is populated from `GET /channel-types`, not a hardcoded
 * list (FR-ADM-06/`ChannelCreate.type`'s own validated-at-request-time
 * contract, Prompt F7's own NON-OBVIOUS note). Health history is polled on
 * an interval TanStack Query controls (`useChannelHealthHistoryQuery`'s own
 * `refetchInterval`), never rendered as a spinner implying a live socket —
 * there is no push mechanism to this UI.
 */
export function ProjectChannelsView({ projectId }: { projectId: string }) {
  const { data: channels, isLoading } = useChannelsQuery(projectId);
  const { data: channelTypes } = useChannelTypesQuery();
  const attachMutation = useAttachChannelMutation(projectId);
  const detachMutation = useDetachChannelMutation(projectId);
  const reconnectMutation = useReconnectChannelMutation(projectId);

  const [type, setType] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  const { data: history } = useChannelHealthHistoryQuery(projectId, expandedChannel);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel title="Channels">
        {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
        {channels && channels.length === 0 && (
          <p className="mb-3 text-sm text-ink-muted">No channels attached yet.</p>
        )}
        {channels && channels.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1.5">
            {channels.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink">
                    {c.type}
                    {c.external_ref && (
                      <span className="ml-1.5 font-mono text-xs text-ink-muted">{c.external_ref}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.healthy ? "bg-good-soft text-good" : "bg-critical-soft text-critical"
                      }`}
                    >
                      {c.healthy ? "healthy" : "degraded"}
                    </span>
                    {!c.healthy && (
                      <button
                        type="button"
                        disabled={reconnectMutation.isPending}
                        onClick={() => reconnectMutation.mutate(c.id)}
                        className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
                      >
                        Reconnect
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedChannel(expandedChannel === c.id ? null : c.id)}
                      className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal"
                    >
                      {expandedChannel === c.id ? "Hide history" : "Health history"}
                    </button>
                    <button
                      type="button"
                      disabled={detachMutation.isPending}
                      onClick={() => {
                        if (expandedChannel === c.id) setExpandedChannel(null);
                        detachMutation.mutate(c.id);
                      }}
                      className="rounded-md border border-border-strong px-2 py-1 text-xs text-critical hover:border-critical disabled:opacity-50"
                    >
                      Detach
                    </button>
                  </span>
                </div>
                {expandedChannel === c.id && (
                  <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                    {(history ?? []).length === 0 && (
                      <li className="text-xs text-ink-muted">
                        No health checks recorded yet (checked every 15 minutes).
                      </li>
                    )}
                    {(history ?? []).map((h) => (
                      <li key={h.id} className="font-mono text-xs text-ink-muted">
                        {formatDateTime(h.checked_at)} — {h.healthy ? "healthy" : "unhealthy"}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!type) return;
            attachMutation.mutate(
              { type, external_ref: externalRef || null },
              { onSuccess: () => setExternalRef("") },
            );
          }}
          className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
        >
          <label className="text-xs text-ink-secondary">
            Channel type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-48 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            >
              <option value="">Select…</option>
              {channelTypes?.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-secondary">
            External reference (optional)
            <input
              type="text"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="e.g. group name, mailbox"
              className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={!type || attachMutation.isPending}
            className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Attach channel
          </button>
          {attachMutation.isError && (
            <p className="w-full text-xs text-critical">Could not attach channel — please retry.</p>
          )}
        </form>
      </SectionPanel>
    </div>
  );
}
