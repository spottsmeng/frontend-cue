"use client";

import { useState } from "react";

import {
  useBudgetHistoryQuery,
  useBudgetQuery,
  useCreateBudgetMutation,
  useReviseBudgetMutation,
} from "@/lib/budget/hooks";
import { formatDateTime, formatMoney } from "@/lib/format";

import { SectionPanel } from "../living-wip/section-panel";

/**
 * WHAT TO BUILD #8 (FR-ADM-11): baseline creation/revision, per project.
 * `POST` (baseline) and `POST .../revise` are two distinct calls server-
 * side — this screen offers whichever one is valid given
 * `useBudgetQuery`'s own result, never both at once. History
 * (`GET .../budget/history`, this milestone's own frontend-enablement
 * addition — backend/PROGRESS.md's "round 7") shows the baseline alongside
 * every revision, most recent first, so a revision's own effect is visible
 * without leaving this screen.
 */
export function ProjectBudgetView({ projectId }: { projectId: string }) {
  const { data: current, isLoading } = useBudgetQuery(projectId);
  const { data: history } = useBudgetHistoryQuery(projectId);
  const createMutation = useCreateBudgetMutation(projectId);
  const reviseMutation = useReviseBudgetMutation(projectId);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("SGD");

  const activeMutation = current ? reviseMutation : createMutation;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel title="Budget">
        {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
        {!isLoading && (
          <p className="mb-3 text-sm text-ink">
            {current
              ? `Current baseline: ${formatMoney(current.approved_amount, current.currency)}`
              : "No budget baseline recorded yet."}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!amount || !currency) return;
            activeMutation.mutate(
              { approved_amount: Number(amount), currency },
              { onSuccess: () => setAmount("") },
            );
          }}
          className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
        >
          <label className="text-xs text-ink-secondary">
            Approved amount
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-40 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
            />
          </label>
          <label className="text-xs text-ink-secondary">
            Currency
            <input
              required
              type="text"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="mt-1 block w-20 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={activeMutation.isPending}
            className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {current ? "Record revision" : "Record baseline"}
          </button>
          {activeMutation.isError && (
            <p className="w-full text-xs text-critical">Could not save — please retry.</p>
          )}
        </form>

        <p className="mb-1.5 text-xs uppercase tracking-wide text-ink-muted">History</p>
        {(history ?? []).length === 0 && (
          <p className="text-sm text-ink-muted">No baseline recorded yet.</p>
        )}
        {(history ?? []).length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {history!.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="text-ink">
                  {formatMoney(b.approved_amount, b.currency)}
                  {!b.revision_of && (
                    <span className="ml-2 rounded-full bg-surface-sunk px-2 py-0.5 text-xs text-ink-muted">
                      baseline
                    </span>
                  )}
                  {b.is_current && (
                    <span className="ml-2 rounded-full bg-signal-soft px-2 py-0.5 text-xs text-signal">
                      current
                    </span>
                  )}
                </span>
                <span className="font-mono text-xs text-ink-muted">
                  approved {formatDateTime(b.approved_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    </div>
  );
}
