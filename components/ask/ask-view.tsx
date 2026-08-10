"use client";

import { useState } from "react";

import { CommitmentDetailPanel } from "@/components/living-wip/commitment-detail-panel";

import { ChatView } from "./chat-view";
import { SuccessorBriefView } from "./successor-brief-view";
import { SummaryTabs } from "./summary-tabs";

type Tab = "ask" | "summaries" | "brief";

const TABS: { tab: Tab; label: string }[] = [
  { tab: "ask", label: "Ask" },
  { tab: "summaries", label: "Summaries" },
  { tab: "brief", label: "Successor brief" },
];

/**
 * §12.5: Ask "genuinely dual — a quick lookup on the floor, deep retrieval
 * at a desk" — this is the desk half (web). One top-level switcher between
 * the chat surface (FR-ASK-01/02/03/08), the five summary variants
 * (FR-ASK-04/05), and the Successor Brief (FR-ASK-07), sharing one
 * commitment-detail drawer so a citation opened from any of the three lands
 * on the exact same surface F1 already built, per this milestone's own
 * citation-routing instruction.
 */
export function AskView({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<Tab>("ask");
  const [openCommitmentId, setOpenCommitmentId] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-surface/95 px-4 py-2.5 backdrop-blur">
        {TABS.map(({ tab: t, label }) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t ? "bg-signal-soft font-medium text-signal" : "text-ink-secondary hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === "ask" && <ChatView projectId={projectId} onOpenCommitment={setOpenCommitmentId} />}
        {tab === "summaries" && <SummaryTabs projectId={projectId} onOpenCommitment={setOpenCommitmentId} />}
        {tab === "brief" && <SuccessorBriefView projectId={projectId} onOpenCommitment={setOpenCommitmentId} />}
      </div>

      {openCommitmentId && (
        <CommitmentDetailPanel
          projectId={projectId}
          commitmentId={openCommitmentId}
          onClose={() => setOpenCommitmentId(null)}
        />
      )}
    </div>
  );
}
