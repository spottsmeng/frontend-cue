"use client";

import { formatDateTime } from "@/lib/format";
import { useAcknowledgeNotificationMutation, useNotificationsQuery } from "@/lib/foresight/hooks";
import type { NotificationOut } from "@/lib/api/types";

import { EmptyState } from "../living-wip/empty-state";
import { SeverityBadge } from "./severity-badge";

/**
 * FR-NTF-01–05: this recipient's own notifications only (the endpoint
 * itself scopes to `recipient_id == caller`, app/api/notifications.py's own
 * docstring — no project-wide inbox to filter here). Every card leads with
 * `downstream_consequence` (same P3 discipline as the Risk feed) and
 * renders `collapsed_count`/`collapsed_risk_ids` as one "N related
 * findings" line, never as N separate rows — FR-NTF-03's collapsing is
 * already enforced server-side at creation time, so this never re-collapses
 * client-side, only reads what's already collapsed.
 */
export function NotificationList({ projectId }: { projectId: string }) {
  const { data: notifications, isLoading, isError } = useNotificationsQuery(projectId);
  const acknowledgeMutation = useAcknowledgeNotificationMutation(projectId);

  if (isLoading) return <p className="text-sm text-ink-muted">Loading notifications…</p>;
  if (isError) return <p className="text-sm text-critical">Could not load notifications. Please retry.</p>;
  if (!notifications || notifications.length === 0) {
    return <EmptyState message="No notifications for you on this project right now." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {notifications.map((n) => (
        <NotificationRow
          key={n.id}
          notification={n}
          onAcknowledge={() => acknowledgeMutation.mutate(n.id)}
          isAcknowledging={acknowledgeMutation.isPending}
        />
      ))}
    </ul>
  );
}

/** Exported standalone for notification-list.test.tsx — pure presentational, no hooks of its own. */
export function NotificationRow({
  notification,
  onAcknowledge,
  isAcknowledging,
}: {
  notification: NotificationOut;
  onAcknowledge: () => void;
  isAcknowledging: boolean;
}) {
  const n = notification;
  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink">{n.downstream_consequence}</p>
        <SeverityBadge severity={n.severity} />
      </div>

      {n.collapsed_count > 1 && (
        <p className="mt-1 text-xs text-ink-secondary">{n.collapsed_count} related findings</p>
      )}

      <p className="mt-1.5 font-mono text-xs text-ink-muted">
        {formatDateTime(n.created_at)} ·{" "}
        {n.delivered_via === "webhook" && n.sent_at
          ? `delivered via webhook at ${formatDateTime(n.sent_at)}`
          : "not yet delivered"}
      </p>

      {n.acknowledged_at ? (
        <p className="mt-2 text-xs text-ink-muted">Acknowledged {formatDateTime(n.acknowledged_at)}</p>
      ) : (
        <button
          type="button"
          disabled={isAcknowledging}
          onClick={onAcknowledge}
          className="mt-2 rounded-md border border-signal px-3 py-1.5 text-xs font-medium text-signal hover:bg-signal-soft disabled:opacity-50"
        >
          Acknowledge
        </button>
      )}
    </li>
  );
}
