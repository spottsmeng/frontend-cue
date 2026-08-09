"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/format";
import {
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useWebhooksQuery,
} from "@/lib/foresight/hooks";
import type { MembershipRole, WebhookEventType } from "@/lib/api/types";
import { hasAnyRole, WRITE_ROLES } from "@/lib/roles";

import { EmptyState } from "../living-wip/empty-state";
import { WebhookSecretDialog } from "./webhook-secret-dialog";

const EVENT_TYPES: WebhookEventType[] = ["commitment", "risk", "deviation"];

/** Item 8: `/webhooks` subscription admin — list/create/delete, write-role gated (app/api/webhooks.py). */
export function WebhookAdminPanel({
  projectId,
  effectiveRoles,
}: {
  projectId: string;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const canWrite = hasAnyRole(effectiveRoles, WRITE_ROLES);
  const { data: webhooks, isLoading, isError } = useWebhooksQuery(projectId);
  const createMutation = useCreateWebhookMutation(projectId);
  const deleteMutation = useDeleteWebhookMutation(projectId);

  const [url, setUrl] = useState("");
  const [eventTypes, setEventTypes] = useState<WebhookEventType[]>([]);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-ink-muted">Loading webhooks…</p>;
  if (isError) return <p className="text-sm text-critical">Could not load webhooks. Please retry.</p>;

  return (
    <div className="flex flex-col gap-3">
      {!webhooks || webhooks.length === 0 ? (
        <EmptyState message="No webhook subscriptions on this project yet." />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {webhooks.map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
            >
              <div>
                <p className="font-mono text-xs text-ink">{w.url}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {w.event_types.join(", ")} · {w.active ? "active" : "inactive"} · created{" "}
                  {formatDateTime(w.created_at)}
                </p>
              </div>
              {canWrite && (
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(w.id)}
                  className="rounded-md border border-border-strong px-2 py-1 text-xs text-critical hover:border-critical disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!url || eventTypes.length === 0) return;
            createMutation.mutate(
              { url, eventTypes },
              {
                onSuccess: (data) => {
                  setRevealedSecret(data.secret);
                  setUrl("");
                  setEventTypes([]);
                },
              },
            );
          }}
          className="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <label className="text-xs text-ink-secondary">
            URL
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/cue-webhook"
              className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
            />
          </label>
          <fieldset className="flex flex-wrap gap-3">
            <legend className="text-xs text-ink-secondary">Events</legend>
            {EVENT_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <input
                  type="checkbox"
                  checked={eventTypes.includes(type)}
                  onChange={(e) =>
                    setEventTypes(
                      e.target.checked ? [...eventTypes, type] : eventTypes.filter((t) => t !== type),
                    )
                  }
                />
                {type}
              </label>
            ))}
          </fieldset>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="self-start rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating…" : "Create webhook"}
          </button>
          {createMutation.isError && (
            <p className="text-xs text-critical">Could not create webhook — please retry.</p>
          )}
        </form>
      )}

      {revealedSecret && (
        <WebhookSecretDialog secret={revealedSecret} onDismiss={() => setRevealedSecret(null)} />
      )}
    </div>
  );
}
