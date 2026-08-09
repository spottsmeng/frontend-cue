"use client";

import { useState } from "react";

import { useReviseBudgetMutation } from "@/lib/budget/hooks";
import type { MembershipRole } from "@/lib/api/types";
import { FINANCE_ROLES, hasAnyRole } from "@/lib/roles";

/**
 * §6.10/FR-LED-13's "same in-place-edit treatment" for the budget baseline
 * — FR-ADM-11: always a new Budget row via `POST .../budget/revise`, never
 * an in-place UPDATE (the API's own job, not this form's); Finance/Producer
 * only, same tier `require_project_role(*FINANCE_ROLES)` enforces
 * server-side.
 */
export function BudgetReviseForm({
  projectId,
  currentCurrency,
  effectiveRoles,
}: {
  projectId: string;
  currentCurrency: string | null;
  effectiveRoles: MembershipRole[] | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(currentCurrency ?? "SGD");
  const reviseMutation = useReviseBudgetMutation(projectId);

  if (!hasAnyRole(effectiveRoles, FINANCE_ROLES)) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary hover:border-signal hover:text-signal"
      >
        Revise budget
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!amount) return;
        reviseMutation.mutate(
          { approved_amount: Number(amount), currency },
          { onSuccess: () => setOpen(false) },
        );
      }}
      className="flex items-end gap-2"
    >
      <label className="text-xs text-ink-secondary">
        New approved amount
        <input
          type="number"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 block w-32 rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
        />
      </label>
      <label className="text-xs text-ink-secondary">
        Currency
        <input
          value={currency}
          maxLength={3}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          className="mt-1 block w-16 rounded-md border border-border bg-surface p-1.5 font-mono text-sm uppercase text-ink"
        />
      </label>
      <button
        type="submit"
        disabled={reviseMutation.isPending}
        className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary"
      >
        Cancel
      </button>
      {reviseMutation.isError && (
        <p className="text-xs text-critical">Could not save.</p>
      )}
    </form>
  );
}
