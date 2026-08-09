"use client";

import { useState } from "react";

import { formatDateTime } from "@/lib/format";
import type { CommitmentCorrection, CommitmentOut } from "@/lib/api/types";
import { FINANCE_ROLES, hasAnyRole, useEffectiveRoles } from "@/lib/roles";
import { useCommitmentQuery, usePaymentStatusMutation, useVerifyCommitmentMutation } from "@/lib/commitments/hooks";

import { DetailDrawer } from "./detail-drawer";
import { EvidenceViewer } from "./evidence-viewer";
import { VerificationBadge } from "./verification-badge";
import { WritebackPanel } from "./writeback-panel";

// `<input type="datetime-local">` wants "YYYY-MM-DDTHH:mm" *in the
// browser's local timezone*, and interprets whatever string you set it to
// the same way (`new Date("2026-08-19T13:42")` is parsed as local time,
// not UTC). The API's `due_at` is a UTC ISO string — slicing its first 16
// characters directly (an earlier version of this function) mislabels raw
// UTC wall-clock digits as local ones, showing/editing the wrong instant
// everywhere the browser's zone isn't UTC+0. Going through `Date`'s own
// local-timezone getters is what actually round-trips correctly.
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FormState {
  deliverable_en: string;
  deliverable_original: string;
  due_at: string;
  amount: string;
  currency: string;
}

function formFromCommitment(c: CommitmentOut): FormState {
  return {
    deliverable_en: c.deliverable_en,
    deliverable_original: c.deliverable_original ?? "",
    due_at: toDatetimeLocal(c.due_at),
    amount: c.amount === null ? "" : String(c.amount),
    currency: c.currency ?? "",
  };
}

function buildCorrections(original: CommitmentOut, form: FormState): CommitmentCorrection | undefined {
  const corrections: CommitmentCorrection = {};
  let changed = false;

  if (form.deliverable_en !== original.deliverable_en) {
    corrections.deliverable_en = form.deliverable_en;
    changed = true;
  }
  const original_original = original.deliverable_original ?? "";
  if (form.deliverable_original !== original_original) {
    corrections.deliverable_original = form.deliverable_original || null;
    changed = true;
  }
  // Compare against the *same* minute-precision, browser-local rendering
  // the input was initialised from, not the original's full-precision UTC
  // ISO string — the datetime-local input can only ever express minute
  // precision, so comparing full precision would flag "unchanged" as
  // "corrected" on every save purely from the seconds/microseconds a
  // real due_at almost always carries (this cost a live test run a
  // spurious human_corrected instead of human_verified before being
  // caught — see frontend/PROGRESS.md's F1 notes).
  if (form.due_at !== toDatetimeLocal(original.due_at)) {
    corrections.due_at = form.due_at ? new Date(form.due_at).toISOString() : null;
    changed = true;
  }
  const amountNum = form.amount === "" ? null : Number(form.amount);
  if (amountNum !== original.amount) {
    corrections.amount = amountNum;
    changed = true;
  }
  const currencyVal = form.currency || null;
  if (currencyVal !== original.currency) {
    corrections.currency = currencyVal;
    changed = true;
  }

  return changed ? corrections : undefined;
}

/**
 * FR-LED-08's three-tap verification (view / correct / confirm) as one
 * surface, plus the two other monetary-field write paths §6.10/FR-LED-13
 * name the same in-place-edit treatment for (payment-status here; budget
 * baseline revision lives in the budget-summary section itself, since it
 * isn't scoped to one commitment) and FR-WBK's write-back flow, since a PM
 * reviewing a commitment is exactly the moment they'd also confirm it with
 * the vendor — one detail surface, not three.
 */
export function CommitmentDetailPanel({
  projectId,
  commitmentId,
  onClose,
}: {
  projectId: string;
  commitmentId: string;
  onClose: () => void;
}) {
  const { data: commitment, isLoading } = useCommitmentQuery(projectId, commitmentId);
  const { data: roles } = useEffectiveRoles(projectId);
  const verifyMutation = useVerifyCommitmentMutation(projectId);
  const paymentStatusMutation = usePaymentStatusMutation(projectId);

  // React's own "adjusting state during render" pattern (not an effect —
  // this needs to reset synchronously, before paint, whenever a different
  // commitment loads or a fresh verify response comes back) rather than a
  // useEffect+setState round trip, which the lint rule below flags as a
  // cascading-render anti-pattern.
  const [loadedFor, setLoadedFor] = useState<{ id: string; updatedAt: string } | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  if (commitment && (loadedFor?.id !== commitment.id || loadedFor.updatedAt !== commitment.updated_at)) {
    setLoadedFor({ id: commitment.id, updatedAt: commitment.updated_at });
    setForm(formFromCommitment(commitment));
  }

  const canSetPaymentStatus = hasAnyRole(roles?.roles, FINANCE_ROLES);

  return (
    <DetailDrawer title="Commitment" onClose={onClose}>
      {isLoading || !commitment || !form ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-ink">{commitment.deliverable_en}</h3>
              <VerificationBadge state={commitment.verification_state} />
            </div>
            {commitment.deliverable_original &&
              commitment.deliverable_original !== commitment.deliverable_en && (
                <p lang="zh" className="mt-0.5 text-sm text-ink-secondary">
                  {commitment.deliverable_original}
                </p>
              )}
            <p className="mt-1 font-mono text-xs text-ink-muted">
              state: {commitment.state}
              {commitment.verified_at &&
                ` · verified ${formatDateTime(commitment.verified_at)}`}
            </p>
          </div>

          <section>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Evidence
            </h4>
            <EvidenceViewer evidence={commitment.evidence} />
          </section>

          <section>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Correct &amp; confirm
            </h4>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-ink-secondary">
                Deliverable
                <input
                  value={form.deliverable_en}
                  onChange={(e) => setForm({ ...form, deliverable_en: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
                />
              </label>
              <label className="text-xs text-ink-secondary">
                Deliverable (original language)
                <input
                  value={form.deliverable_original}
                  onChange={(e) => setForm({ ...form, deliverable_original: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
                />
              </label>
              <div className="flex gap-2">
                <label className="flex-1 text-xs text-ink-secondary">
                  Due
                  <input
                    type="datetime-local"
                    value={form.due_at}
                    onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
                  />
                </label>
                <label className="w-28 text-xs text-ink-secondary">
                  Amount
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
                  />
                </label>
                <label className="w-20 text-xs text-ink-secondary">
                  Currency
                  <input
                    value={form.currency}
                    maxLength={3}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="mt-1 w-full rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink uppercase"
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={verifyMutation.isPending}
                onClick={() =>
                  verifyMutation.mutate({
                    commitmentId,
                    corrections: buildCorrections(commitment, form),
                  })
                }
                className="mt-1 self-start rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {verifyMutation.isPending ? "Saving…" : "Confirm"}
              </button>
              {verifyMutation.isError && (
                <p className="text-xs text-critical">Could not save — please try again.</p>
              )}
              {verifyMutation.isSuccess && (
                <p className="text-xs text-good">Saved.</p>
              )}
            </div>
          </section>

          <section>
            <h4 className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-ink-muted">
              Payment status
            </h4>
            {canSetPaymentStatus ? (
              <select
                value={commitment.payment_status ?? ""}
                onChange={(e) =>
                  paymentStatusMutation.mutate({
                    commitmentId,
                    paymentStatus: e.target.value as "unpaid" | "invoiced" | "paid",
                  })
                }
                disabled={paymentStatusMutation.isPending}
                className="rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
              >
                <option value="" disabled>
                  Not set
                </option>
                <option value="unpaid">Unpaid</option>
                <option value="invoiced">Invoiced</option>
                <option value="paid">Paid</option>
              </select>
            ) : (
              <p className="text-sm text-ink-secondary">
                {commitment.payment_status ?? "Not set"}{" "}
                <span className="text-ink-muted">
                  (Finance or Producer role required to change)
                </span>
              </p>
            )}
          </section>

          <section>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Write-back
            </h4>
            <WritebackPanel
              projectId={projectId}
              commitmentId={commitmentId}
              effectiveRoles={roles?.roles}
            />
          </section>
        </>
      )}
    </DetailDrawer>
  );
}
