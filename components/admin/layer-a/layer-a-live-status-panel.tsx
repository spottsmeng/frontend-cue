"use client";

import { useTranslations } from "next-intl";

import { AdminPermissionError } from "@/lib/admin/members-hooks";
import { useLayerAAccountsQuery } from "@/lib/admin/layer-a-hooks";

import { LayerAStatusBadge } from "./layer-a-status-badge";

/** Layer A's own accountSummary() detail bag is connector-defined (see
 * app/layer_a's backend docstrings) — connectAttempts is the one field
 * every connector's health() merge is guaranteed to carry (SessionManager
 * always adds it), read defensively rather than assumed typed. */
function connectAttemptsOf(detail: Record<string, unknown> | null | undefined): number | null {
  const value = detail?.connectAttempts;
  return typeof value === "number" ? value : null;
}

/**
 * The exact gap the old layer-A/public/index.html ops console left:
 * connectAttempts exists in the live API response but was never rendered
 * anywhere. font-mono/tabular-nums for the count, per DESIGN.md's "evidence,
 * timestamps, amounts, IDs" rule.
 */
export function LayerALiveStatusPanel() {
  const t = useTranslations("admin.layerA.liveStatus");
  const { data, isLoading, isError, error } = useLayerAAccountsQuery({ refetchInterval: 15_000 });

  if (isLoading) return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (isError) {
    return (
      <p className="text-sm text-ink-muted">
        {error instanceof AdminPermissionError ? t("adminOnly") : t("loadError")}
      </p>
    );
  }
  if (data?.unconfigured) {
    return <p className="text-sm text-ink-muted">{t("unconfigured")}</p>;
  }
  if (!data?.accounts.length) {
    return <p className="text-sm text-ink-muted">{t("empty")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-ink-muted">
            <th className="py-1 pr-4 font-medium">{t("headers.account")}</th>
            <th className="py-1 pr-4 font-medium">{t("headers.status")}</th>
            <th className="py-1 pr-4 font-medium">{t("headers.connectAttempts")}</th>
            <th className="py-1 font-medium">{t("headers.lastError")}</th>
          </tr>
        </thead>
        <tbody>
          {data.accounts.map((account) => (
            <tr key={account.accountId} className="border-t border-border">
              <td className="py-1.5 pr-4 text-ink">
                {account.displayName ?? account.accountId}
                <span className="ml-1.5 text-ink-muted">({account.riskTier ?? "—"})</span>
              </td>
              <td className="py-1.5 pr-4">
                <LayerAStatusBadge status={account.status} />
              </td>
              <td className="py-1.5 pr-4 font-mono tabular-nums text-ink">
                {connectAttemptsOf(account.detail) ?? "—"}
              </td>
              <td className="py-1.5 text-ink-secondary">{account.lastError ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
