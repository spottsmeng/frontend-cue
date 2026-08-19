import { useTranslations } from "next-intl";

import type { LayerAWorkerStatus } from "@/lib/api/types";

import { StatusDot } from "../../living-wip/status-dot";

/** Layer A's own 6-value closed set (layer-A/src/session-manager/index.ts's
 * WorkerStatus, plus the admin API's synthesized "unknown") mapped onto
 * this app's status quad — modeled directly on components/foresight/
 * severity-badge.tsx, same icon+label-always-paired discipline (DESIGN.md
 * §12.1). */
const CONFIG: Record<
  LayerAWorkerStatus,
  { bg: string; text: string; dot: "good" | "warning" | "serious" | "critical" | "muted" }
> = {
  connected: { bg: "bg-good-soft", text: "text-good", dot: "good" },
  connecting: { bg: "bg-warning-soft", text: "text-warning", dot: "warning" },
  reconnecting: { bg: "bg-warning-soft", text: "text-warning", dot: "warning" },
  unhealthy: { bg: "bg-serious-soft", text: "text-serious", dot: "serious" },
  disconnected: { bg: "bg-critical-soft", text: "text-critical", dot: "critical" },
  unknown: { bg: "bg-surface-sunk", text: "text-ink-secondary", dot: "muted" },
};

export function LayerAStatusBadge({ status }: { status: LayerAWorkerStatus }) {
  const t = useTranslations("admin.layerA.status");
  const { bg, text, dot } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      <StatusDot tone={dot} />
      {t(status)}
    </span>
  );
}
