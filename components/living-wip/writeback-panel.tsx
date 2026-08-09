"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/format";
import type { MembershipRole } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";
import {
  useAuthoriseWritebackMutation,
  useDraftWritebackMutation,
  useEditWritebackDraftMutation,
  useSendWritebackMutation,
  useWritebackHistoryQuery,
} from "@/lib/writeback/hooks";

/**
 * FR-WBK: "confirm with vendor" from a commitment's own detail view — never
 * a standalone compose screen (OutboundMessage.commitment_id is NOT NULL by
 * design). Draft → authorise → send as three explicit, separate, visible
 * steps (FR-WBK-05's "never post autonomously" made real in the UI, not
 * just the backend) — a PM can stop between authorising and sending if
 * something changes, so this deliberately never collapses them into one
 * button even though it's fewer clicks.
 */
export function WritebackPanel({
  projectId,
  commitmentId,
  effectiveRoles,
}: {
  projectId: string;
  commitmentId: string;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const canWrite = hasAnyRole(effectiveRoles, WRITE_ROLES);
  const { data: history, isLoading } = useWritebackHistoryQuery(projectId, commitmentId);
  const draftMutation = useDraftWritebackMutation(projectId);
  const editMutation = useEditWritebackDraftMutation(projectId);
  const authoriseMutation = useAuthoriseWritebackMutation(projectId);
  const sendMutation = useSendWritebackMutation(projectId);

  const [draftText, setDraftText] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-sm text-ink-muted">Loading write-back history…</p>;
  }

  // list_writeback_history orders by created_at desc, so the first
  // not-yet-sent row (if any) is the current in-flight one.
  const active = history?.find((m) => m.status !== "sent");
  const sent = history?.filter((m) => m.status === "sent") ?? [];
  const editedText = draftText ?? active?.draft_text ?? "";

  return (
    <div className="flex flex-col gap-3">
      {active ? (
        <div className="rounded-md border border-border-strong bg-surface-sunk p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
            <span>
              {active.status === "draft" ? "Draft — not yet sent" : "Authorised — not yet sent"}
            </span>
            <span className="font-mono">{active.language}</span>
          </div>

          {active.status === "draft" ? (
            <textarea
              aria-label="Draft message"
              value={editedText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-surface p-2 text-sm text-ink"
              disabled={!canWrite}
            />
          ) : (
            <p className="text-sm text-ink">{active.draft_text}</p>
          )}

          {canWrite && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {active.status === "draft" && (
                <>
                  <button
                    type="button"
                    disabled={editMutation.isPending || editedText === active.draft_text}
                    onClick={() =>
                      editMutation.mutate({ outboundId: active.id, draftText: editedText })
                    }
                    className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary hover:border-signal hover:text-signal disabled:opacity-50"
                  >
                    Save edit
                  </button>
                  <button
                    type="button"
                    disabled={authoriseMutation.isPending}
                    onClick={() => authoriseMutation.mutate(active.id)}
                    className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Authorise
                  </button>
                </>
              )}
              {active.status === "authorised" && (
                <button
                  type="button"
                  disabled={sendMutation.isPending}
                  onClick={() => sendMutation.mutate(active.id)}
                  className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Send
                </button>
              )}
            </div>
          )}

          {editMutation.isError && (
            <p className="mt-2 text-xs text-critical">{errorMessage(editMutation.error)}</p>
          )}
          {authoriseMutation.isError && (
            <p className="mt-2 text-xs text-critical">{errorMessage(authoriseMutation.error)}</p>
          )}
          {sendMutation.isError && (
            <p className="mt-2 text-xs text-critical">{errorMessage(sendMutation.error)}</p>
          )}
        </div>
      ) : (
        canWrite && (
          <div>
            <button
              type="button"
              disabled={draftMutation.isPending}
              onClick={() => draftMutation.mutate(commitmentId)}
              className="rounded-md border border-signal px-3 py-1.5 text-xs font-medium text-signal hover:bg-signal-soft disabled:opacity-50"
            >
              Confirm with vendor
            </button>
            {draftMutation.isError && (
              <p className="mt-2 text-xs text-critical">{errorMessage(draftMutation.error)}</p>
            )}
          </div>
        )
      )}

      {sent.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Prior outbound messages
          </h4>
          <ul className="flex flex-col gap-1.5">
            {sent.map((m) => (
              <li key={m.id} className="rounded-md border border-border p-2 text-xs">
                <div className="flex justify-between text-ink-muted">
                  <span>{formatDateTime(m.sent_at)}</span>
                  <span>{m.reply_outcome ?? "no reply yet"}</span>
                </div>
                <p className="mt-1 text-ink">{m.draft_text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!canWrite && !active && sent.length === 0 && (
        <p className="text-sm text-ink-muted">No write-back activity on this commitment yet.</p>
      )}
    </div>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "detail" in error) {
    return String((error as { detail: unknown }).detail);
  }
  return "something went wrong";
}
