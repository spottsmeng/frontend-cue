"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AdminPermissionError } from "@/lib/admin/members-hooks";
import { useLayerAAccountsQuery, useLayerAMultiTrendQuery } from "@/lib/admin/layer-a-hooks";
import { formatDateTime } from "@/lib/format";

import { ChartLegend } from "@/components/charts/chart-legend";
import { ThemedLineChart, type ChartSeries } from "@/components/charts/themed-line-chart";

import { LayerAStatusBadge } from "./layer-a-status-badge";

// DESIGN.md's chart-* palette is fixed at five slots — the same cap
// chart-colors.ts already enforces by index, applied here as a hard limit
// on the picker itself rather than silently dropping a sixth selection.
const MAX_SELECTED_ACCOUNTS = 5;

export function LayerATrendPanel() {
  const t = useTranslations("admin.layerA.trend");
  const { data: accountsData } = useLayerAAccountsQuery();
  const accounts = accountsData?.accounts ?? [];
  const [selected, setSelected] = useState<string[]>(() => accounts.slice(0, 1).map((a) => a.accountId));

  const effectiveSelected = selected.filter((id) => accounts.some((a) => a.accountId === id));
  const { data, isLoading, isError, error } = useLayerAMultiTrendQuery(effectiveSelected);

  function toggle(accountId: string) {
    setSelected((prev) => {
      if (prev.includes(accountId)) return prev.filter((id) => id !== accountId);
      if (prev.length >= MAX_SELECTED_ACCOUNTS) return prev;
      return [...prev, accountId];
    });
  }

  if (accounts.length === 0) {
    return <p className="text-sm text-ink-muted">{t("empty")}</p>;
  }

  const series: ChartSeries[] = (data ?? []).map(({ accountId, snapshots }) => {
    const account = accounts.find((a) => a.accountId === accountId);
    // Newest-first from the API — reversed to chronological order, which
    // LinePath draws in array order.
    const chronological = [...snapshots].reverse();
    return {
      id: accountId,
      label: account?.displayName ?? accountId,
      points: chronological.map((s) => ({ x: s.recorded_at, value: s.status === "connected" ? 1 : 0 })),
    };
  });

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-1 text-xs text-ink-secondary">{t("pickerLabel")}</legend>
        {accounts.map((account) => (
          <label key={account.accountId} className="flex items-center gap-1.5 text-xs text-ink">
            <input
              type="checkbox"
              checked={selected.includes(account.accountId)}
              disabled={
                !selected.includes(account.accountId) && selected.length >= MAX_SELECTED_ACCOUNTS
              }
              onChange={() => toggle(account.accountId)}
            />
            {account.displayName ?? account.accountId}
          </label>
        ))}
      </fieldset>

      {effectiveSelected.length === 0 && <p className="text-sm text-ink-muted">{t("pickAnAccount")}</p>}
      {isError && (
        <p className="text-sm text-ink-muted">
          {error instanceof AdminPermissionError ? t("adminOnly") : t("loadError")}
        </p>
      )}
      {isLoading && effectiveSelected.length > 0 && <p className="text-sm text-ink-muted">{t("loading")}</p>}

      {series.length > 0 && (
        <>
          <ThemedLineChart
            series={series}
            valueFormat={(v) => (v >= 0.5 ? t("connected") : t("notConnected"))}
            ariaLabel={t("chartAriaLabel")}
          />
          <ChartLegend items={series.map((s) => ({ id: s.id, label: s.label }))} />
          <div className="max-h-64 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-ink-muted">
                  <th className="py-1 pr-4 font-medium">{t("headers.account")}</th>
                  <th className="py-1 pr-4 font-medium">{t("headers.recordedAt")}</th>
                  <th className="py-1 font-medium">{t("headers.status")}</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).flatMap(({ accountId, snapshots }) => {
                  const account = accounts.find((a) => a.accountId === accountId);
                  return snapshots.map((s) => (
                    <tr key={`${accountId}-${s.id}`} className="border-t border-border">
                      <td className="py-1 pr-4 text-ink">{account?.displayName ?? accountId}</td>
                      <td className="py-1 pr-4 font-mono tabular-nums text-ink-secondary">
                        {formatDateTime(s.recorded_at)}
                      </td>
                      <td className="py-1">
                        <LayerAStatusBadge status={s.status} />
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
