"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { formatDateTime } from "@/lib/format";
import type { EvidenceOut } from "@/lib/api/types";

import { ConfidenceBadge } from "../ui/confidence-badge";

/**
 * P7 ("the original language is never lost") + FR-VOI-05 (audio playback
 * from any evidence link) — every evidence span gets an original/
 * translation toggle (never translate-and-discard) and, where `media_ref`
 * is set, an audio player. `lang` is always set from the API's own value
 * (DESIGN.md: "never render evidence text without setting lang from the
 * API's own value" — a missing attribute silently falls through to Geist
 * Sans, which has no CJK glyphs and shows tofu); the translation is always
 * English (this schema's own convention throughout — deliverable_en/
 * *_original pairs the same way), so it renders under `lang="en"`.
 */
export function EvidenceViewer({ evidence }: { evidence: EvidenceOut[] }) {
  const t = useTranslations("livingWip.evidenceViewer");
  if (evidence.length === 0) {
    return <p className="text-sm text-ink-muted">{t("noEvidence")}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {evidence.map((e) => (
        <EvidenceItem key={e.id} evidence={e} />
      ))}
    </ul>
  );
}

/** Exported standalone for evidence-viewer.test.tsx. */
export function EvidenceItem({ evidence }: { evidence: EvidenceOut }) {
  const t = useTranslations("livingWip.evidenceViewer");
  const [showTranslation, setShowTranslation] = useState(false);
  const displayingTranslation = showTranslation && evidence.translation !== null;

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span className="font-mono">
          {evidence.channel} · {formatDateTime(evidence.sent_at)}
        </span>
        {evidence.translation !== null && (
          <div className="flex overflow-hidden rounded-md border border-border-strong">
            <button
              type="button"
              onClick={() => setShowTranslation(false)}
              aria-pressed={!displayingTranslation}
              className={`px-2 py-0.5 text-xs ${!displayingTranslation ? "bg-signal-soft text-signal" : "text-ink-secondary"}`}
            >
              {t("original")}
            </button>
            <button
              type="button"
              onClick={() => setShowTranslation(true)}
              aria-pressed={displayingTranslation}
              className={`px-2 py-0.5 text-xs ${displayingTranslation ? "bg-signal-soft text-signal" : "text-ink-secondary"}`}
            >
              {t("translation")}
            </button>
          </div>
        )}
      </div>

      <p
        lang={displayingTranslation ? "en" : evidence.language}
        className="mt-2 text-sm text-ink"
      >
        {displayingTranslation ? evidence.translation : evidence.original_text}
      </p>

      {evidence.media_ref && (
        <>
          <audio controls src={evidence.media_ref} className="mt-2 w-full">
            {t("noAudioSupport")}
          </audio>
          {evidence.transcript_confidence !== null && (
            <div className="mt-1.5">
              <ConfidenceBadge value={evidence.transcript_confidence} />
            </div>
          )}
        </>
      )}
    </li>
  );
}
