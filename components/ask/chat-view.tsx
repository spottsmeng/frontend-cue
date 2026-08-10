"use client";

import { useRef, useState } from "react";

import { useAskQueryMutation } from "@/lib/ask/hooks";
import type { AskAnswer } from "@/lib/api/types";

import { CitationChip } from "./citation-chip";
import { RefusalMessage } from "./refusal-message";

interface Turn {
  id: string;
  question: string;
  answer: AskAnswer | null;
  error: boolean;
}

/**
 * FR-ASK-01/02/03/08 — the chat surface. English or Chinese, no language
 * picker (the backend detects it, per this milestone's own WHAT TO BUILD).
 * `conversationId` is client-owned session state: omitted on the first
 * call, then threaded from the first response's own real id onto every
 * follow-up (FR-ASK-08's own NON-OBVIOUS note — there's no server-side
 * timeout, so this state only ever resets via the explicit "New
 * conversation" action below, never a client-guessed expiry).
 */
export function ChatView({
  projectId,
  onOpenCommitment,
}: {
  projectId: string;
  onOpenCommitment: (commitmentId: string) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const askMutation = useAskQueryMutation(projectId);

  // A question asked just before "New conversation" is clicked can still be
  // in flight when its response lands — without this guard, that late
  // response's own onSuccess would call setConversationId with the *old*
  // conversation's id, silently reviving it right after the reset (caught
  // live: a Playwright run that clicked "New conversation" while a prior
  // answer was still pending saw exactly this). `epochRef` is bumped on
  // every reset; a response is only applied if the epoch it was asked under
  // still matches the current one.
  const epochRef = useRef(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    const turnId = crypto.randomUUID();
    const epoch = epochRef.current;
    setTurns((prev) => [...prev, { id: turnId, question: trimmed, answer: null, error: false }]);
    setQuestion("");
    askMutation.mutate(
      { question: trimmed, conversationId },
      {
        onSuccess: (data) => {
          if (epochRef.current !== epoch) return;
          if (data) setConversationId(data.conversation_id);
          setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, answer: data ?? null } : t)));
        },
        onError: () => {
          if (epochRef.current !== epoch) return;
          setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, error: true } : t)));
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          {conversationId ? "Follow-up questions use this conversation's own context." : "Ask anything about this project — English or Chinese."}
        </p>
        {(turns.length > 0 || conversationId) && (
          <button
            type="button"
            onClick={() => {
              epochRef.current += 1;
              setTurns([]);
              setConversationId(null);
            }}
            className="rounded-md border border-border-strong px-2.5 py-1 text-xs text-ink-secondary hover:border-signal hover:text-signal"
          >
            New conversation
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-4">
        {turns.map((turn) => (
          <li key={turn.id} className="flex flex-col gap-2">
            <p className="self-end rounded-lg bg-signal px-3 py-2 text-sm text-white">{turn.question}</p>

            {turn.error && (
              <p className="self-start rounded-lg border border-critical bg-critical-soft px-3 py-2 text-sm text-critical">
                Could not reach CUE — please try again.
              </p>
            )}

            {!turn.error && !turn.answer && (
              <p className="self-start text-sm text-ink-muted">Thinking — this can take a few seconds…</p>
            )}

            {turn.answer?.available && (
              <div className="self-start max-w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
                <p>{turn.answer.answer}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {turn.answer.citations.map((c) => (
                    <CitationChip
                      key={`${c.source_type}-${c.source_id}`}
                      projectId={projectId}
                      citation={c}
                      onOpenCommitment={onOpenCommitment}
                    />
                  ))}
                </div>
              </div>
            )}

            {turn.answer && !turn.answer.available && turn.answer.refusal_kind && (
              <div className="self-start max-w-full">
                <RefusalMessage
                  projectId={projectId}
                  refusalKind={turn.answer.refusal_kind}
                  unavailableReason={turn.answer.unavailable_reason ?? null}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this project…"
          aria-label="Ask a question"
          className="flex-1 rounded-md border border-border bg-surface p-2 text-sm text-ink"
        />
        <button
          type="submit"
          disabled={askMutation.isPending || !question.trim()}
          className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {askMutation.isPending ? "Asking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
