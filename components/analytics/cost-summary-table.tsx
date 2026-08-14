"use client";

import { useTranslations } from "next-intl";

import { CostSummaryPermissionError, useCostSummaryQuery } from "@/lib/analytics/hooks";
import { formatMoney } from "@/lib/format";
import type { CostSummaryRow } from "@/lib/api/types";

/**
 * PRD §13's "cost per active project" — a direct render of
 * `GET /admin/cost-summary`'s already-real rows (NFR-OBS-03), not a new
 * observability platform. `estimated_cost_usd === null` (a genuinely
 * unrecognised model) is rendered as "unknown", never coalesced to
 * "$0.00" — that string is reserved for a real, honest zero (a self-hosted
 * Ollama call), per `CostSummaryRow`'s own docstring. `project_id` is a raw
 * uuid on the wire with no embedded label (a real Class A gap per
 * frontend/CLAUDE.md's gap-audit checklist) — resolved here against
 * `projectsById`, built from the same `GET /projects` fan-out the trend
 * charts already need, not a second endpoint.
 */
export function CostSummaryTable({ projectsById }: { projectsById: Map<string, string> }) {
  const t = useTranslations("analytics.costSummaryTable");
  const { data, isLoading, isError, error } = useCostSummaryQuery();

  if (isError) {
    if (error instanceof CostSummaryPermissionError) {
      return (
        <p className="text-sm text-ink-muted">
          {t("adminOnly")}
        </p>
      );
    }
    return <p className="text-sm text-critical">{t("loadError")}</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  }
  if (!data || data.rows.length === 0) {
    return <p className="text-sm text-ink-muted">{t("empty")}</p>;
  }

  const projectLabel = (row: CostSummaryRow) => {
    if (row.project_id === null) return t("unattributed");
    return projectsById.get(row.project_id) ?? t("unknownProject");
  };
  const costLabel = (value: number | null) => {
    if (value === null) return t("unknownCost");
    return formatMoney(value, "USD");
  };

  const rows = [...data.rows].sort((a, b) => {
    const nameA = projectLabel(a);
    const nameB = projectLabel(b);
    return nameA.localeCompare(nameB) || a.provider.localeCompare(b.provider);
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-ink-muted">
              <th className="py-1 pr-4 font-medium">{t("headers.project")}</th>
              <th className="py-1 pr-4 font-medium">{t("headers.provider")}</th>
              <th className="py-1 pr-4 font-medium">{t("headers.model")}</th>
              <th className="py-1 pr-4 font-medium">{t("headers.calls")}</th>
              <th className="py-1 pr-4 font-medium">{t("headers.tokensIn")}</th>
              <th className="py-1 pr-4 font-medium">{t("headers.tokensOut")}</th>
              <th className="py-1 font-medium">{t("headers.estimatedCost")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1 pr-4 text-ink">{projectLabel(row)}</td>
                <td className="py-1 pr-4 text-ink-secondary">{row.provider}</td>
                <td className="py-1 pr-4 font-mono text-ink-secondary">{row.model}</td>
                <td className="py-1 pr-4 font-mono text-ink">{row.call_count}</td>
                <td className="py-1 pr-4 font-mono text-ink">{row.tokens_in.toLocaleString("en-SG")}</td>
                <td className="py-1 pr-4 font-mono text-ink">{row.tokens_out.toLocaleString("en-SG")}</td>
                <td className="py-1 font-mono text-ink">{costLabel(row.estimated_cost_usd)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-strong font-medium">
              <td className="py-1.5 pr-4 text-ink" colSpan={3}>
                {t("total")}
              </td>
              <td className="py-1.5 pr-4 font-mono text-ink">{data.total_calls}</td>
              <td className="py-1.5 pr-4" />
              <td className="py-1.5 pr-4" />
              <td className="py-1.5 font-mono text-ink">{costLabel(data.total_estimated_cost_usd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {data.total_estimated_cost_usd === null && (
        <p className="text-xs text-ink-muted">
          {t("unknownCostNote")}
        </p>
      )}
    </div>
  );
}
