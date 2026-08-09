"use client";

import { useState } from "react";

/**
 * `WebhookSubscriptionCreated.secret` is returned exactly once
 * (app/api/schemas.py's own docstring: "the backend will never show it
 * again after this response") — same copy-and-dismiss posture a real
 * API-key-creation flow uses, per this milestone's own instruction. A
 * centered modal, not the side DetailDrawer other surfaces use, since this
 * is a one-time acknowledgement rather than a scrollable detail view.
 */
export function WebhookSecretDialog({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Webhook signing secret"
        className="w-full max-w-md rounded-lg border border-border bg-surface p-4 shadow-pop"
      >
        <h3 className="text-sm font-semibold text-ink">Save this signing secret now</h3>
        <p className="mt-1 text-xs text-ink-secondary">
          This is the only time CUE will show it. If you lose it, delete this webhook and create a
          new one.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-border-strong bg-surface-sunk p-2">
          <code className="flex-1 overflow-x-auto font-mono text-xs text-ink">{secret}</code>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(secret);
              setCopied(true);
            }}
            className="shrink-0 rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal hover:text-signal"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full rounded-md bg-signal px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Done — I&apos;ve saved it
        </button>
      </div>
    </div>
  );
}
