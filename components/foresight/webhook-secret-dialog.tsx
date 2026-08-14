"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * `WebhookSubscriptionCreated.secret` is returned exactly once
 * (app/api/schemas.py's own docstring: "the backend will never show it
 * again after this response") — same copy-and-dismiss posture a real
 * API-key-creation flow uses, per this milestone's own instruction. A
 * centered modal, not the side DetailDrawer other surfaces use, since this
 * is a one-time acknowledgement rather than a scrollable detail view.
 *
 * Focus trap/initial-focus added by F9's own keyboard-only pass, same real
 * bug (and same fix shape) found in components/living-wip/detail-drawer.tsx
 * — `aria-modal="true"` with no actual trap behind it.
 */
export function WebhookSecretDialog({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  const t = useTranslations("foresight.webhookSecretDialog");
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;
    dialogRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onDismiss();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === dialogRef.current) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("dialogLabel")}
        tabIndex={-1}
        className="w-full max-w-md rounded-lg border border-border bg-surface p-4 shadow-pop focus:outline-none"
      >
        <h3 className="text-sm font-semibold text-ink">{t("heading")}</h3>
        <p className="mt-1 text-xs text-ink-secondary">
          {t("explanation")}
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
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full rounded-md bg-signal px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t("done")}
        </button>
      </div>
    </div>
  );
}
