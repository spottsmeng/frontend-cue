"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AdminPermissionError } from "@/lib/admin/members-hooks";
import {
  useAcknowledgeLayerAAlertMutation,
  useLayerAAlertDeliveriesQuery,
  useLayerAAlertsQuery,
} from "@/lib/admin/layer-a-hooks";
import type { LayerAAlertOut } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

import { StatusDot } from "../../living-wip/status-dot";
import { LayerAAlertTypeBadge } from "./layer-a-alert-type-badge";

function AlertSeverityDot({ severity }: { severity: "serious" | "critical" }) {
  const t = useTranslations("admin.layerA.severity");
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
      <StatusDot tone={severity} />
      {t(severity)}
    </span>
  );
}

/** The "reviewable, not fired-and-forgotten" requirement — one row's worth
 * of delivery attempts across all three destinations, fetched only once
 * expanded (each row owns its own query + expand state, the idiomatic way
 * to avoid conditional hook calls inside a list). */
function DeliveryLog({ alertId }: { alertId: string }) {
  const t = useTranslations("admin.layerA.alertHistory.deliveries");
  const { data, isLoading } = useLayerAAlertDeliveriesQuery(alertId, true);

  if (isLoading) return <p className="py-1 text-xs text-ink-muted">{t("loading")}</p>;
  if (!data?.length) return <p className="py-1 text-xs text-ink-muted">{t("empty")}</p>;

  return (
    <ul className="flex flex-col gap-1 py-1">
      {data.map((delivery) => (
        <li key={delivery.id} className="flex items-center gap-2 text-xs">
          <span className={delivery.success ? "text-good" : "text-critical"}>
            {delivery.success ? t("succeeded") : t("failed")}
          </span>
          <span className="text-ink">{t(`channel.${delivery.channel}` as const)}</span>
          <span className="font-mono tabular-nums text-ink-muted">
            {formatDateTime(delivery.attempted_at)}
          </span>
          {delivery.detail && <span className="text-ink-muted">— {delivery.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

function AlertRow({ alert }: { alert: LayerAAlertOut }) {
  const t = useTranslations("admin.layerA.alertHistory");
  const [expanded, setExpanded] = useState(false);
  const acknowledgeMutation = useAcknowledgeLayerAAlertMutation();

  return (
    <>
      <tr className="border-t border-border">
        <td className="py-1.5 pr-4">
          <LayerAAlertTypeBadge alertType={alert.alert_type} />
        </td>
        <td className="py-1.5 pr-4 text-ink">{alert.account_id ?? t("processWide")}</td>
        <td className="py-1.5 pr-4">
          <AlertSeverityDot severity={alert.severity} />
        </td>
        <td className="py-1.5 pr-4 font-mono tabular-nums text-ink-secondary">
          {formatDateTime(alert.opened_at)}
        </td>
        <td className="py-1.5 pr-4 font-mono tabular-nums text-ink-secondary">
          {alert.state === "resolved" ? formatDateTime(alert.resolved_at) : t("stillOpen")}
        </td>
        <td className="py-1.5 pr-4">
          <button
            type="button"
            disabled={acknowledgeMutation.isPending || alert.acknowledged_at !== null}
            onClick={() => acknowledgeMutation.mutate(alert.id)}
            className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
          >
            {alert.acknowledged_at !== null ? t("acknowledged") : t("acknowledge")}
          </button>
        </td>
        <td className="py-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-signal hover:underline"
          >
            {expanded ? t("hideDeliveries") : t("showDeliveries")}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-border bg-surface-sunk">
          <td colSpan={7} className="px-4">
            <DeliveryLog alertId={alert.id} />
          </td>
        </tr>
      )}
    </>
  );
}

export function LayerAAlertHistoryPanel() {
  const t = useTranslations("admin.layerA.alertHistory");
  const { data, isLoading, isError, error } = useLayerAAlertsQuery();

  if (isLoading) return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (isError) {
    return (
      <p className="text-sm text-ink-muted">
        {error instanceof AdminPermissionError ? t("adminOnly") : t("loadError")}
      </p>
    );
  }
  if (!data?.length) return <p className="text-sm text-ink-muted">{t("empty")}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-ink-muted">
            <th className="py-1 pr-4 font-medium">{t("headers.type")}</th>
            <th className="py-1 pr-4 font-medium">{t("headers.account")}</th>
            <th className="py-1 pr-4 font-medium">{t("headers.severity")}</th>
            <th className="py-1 pr-4 font-medium">{t("headers.opened")}</th>
            <th className="py-1 pr-4 font-medium">{t("headers.resolved")}</th>
            <th className="py-1 pr-4 font-medium">{t("headers.acknowledge")}</th>
            <th className="py-1 font-medium">{t("headers.deliveries")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
