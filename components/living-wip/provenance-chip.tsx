"use client";

import { useState } from "react";

import type { ReportProvenanceT } from "@/lib/api/types";

/**
 * FR-RPT-04 + §12.2's "provenance chip on every figure and status... tap
 * opens the source" — a tap on a `source_type === "commitment"` entry opens
 * that commitment's own detail view (evidence, correction, verify — the
 * same three-tap surface `commitment-detail-panel.tsx` renders), since a
 * Commitment's evidence[] is where the underlying message actually lives
 * (CommitmentOut.evidence, per §11.1). Other source types (`budget`,
 * `milestone`, `deviation`, `audit_log`, a project-level constant with no
 * row at all) have no drill-down surface yet — Twin/Foresight/Documents are
 * later milestones — so this renders their type/label inertly rather than
 * a dead link.
 */
export function ProvenanceChip({
  provenance,
  onOpenCommitment,
}: {
  provenance: ReportProvenanceT[];
  onOpenCommitment?: (commitmentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (provenance.length === 0) return null;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`View source (${provenance.length})`}
        title="View source"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border-strong text-[10px] text-ink-muted hover:border-signal hover:text-signal"
      >
        {provenance.length > 1 ? provenance.length : "i"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Provenance"
          className="absolute left-0 top-5 z-30 min-w-56 rounded-lg border border-border bg-surface p-2 shadow-pop"
        >
          <ul className="flex flex-col gap-1">
            {provenance.map((p, i) => {
              const clickable = p.source_type === "commitment" && p.source_id && onOpenCommitment;
              return (
                <li key={`${p.source_type}-${p.source_id ?? i}`}>
                  {clickable ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCommitment(p.source_id!);
                        setOpen(false);
                      }}
                      className="w-full rounded-md px-2 py-1 text-left text-xs text-signal hover:bg-surface-sunk"
                    >
                      {p.label ?? "commitment"} →
                    </button>
                  ) : (
                    <div className="px-2 py-1 text-xs text-ink-muted">
                      {p.source_type}
                      {p.label ? ` · ${p.label}` : ""}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </span>
  );
}
