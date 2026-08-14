"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * F9's own real keyboard-only pass found this drawer claimed `aria-modal`
 * without either half of what that claim requires (WAI-ARIA APG's dialog
 * pattern): focus never moved into it on open, and Tab was never trapped
 * inside it — a keyboard user opening a commitment/milestone detail panel
 * could Tab straight past its own Confirm/Close buttons into the rest of
 * the page behind it, an unreachable-in-practice modal even though it was
 * visibly on screen. Caught by a real Playwright keyboard walk timing out
 * mid-dialog, not inferred from reading the code.
 */
export function DetailDrawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("livingWip.detailDrawer");
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;
    // Move focus into the dialog on mount — the panel's own heading, not
    // the first interactive child (an edit field or a destructive action
    // shouldn't be what a keyboard/screen-reader user lands on
    // unannounced); the heading itself is what identifies what just
    // opened, matching the WAI-ARIA APG dialog pattern's own guidance.
    dialogRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        // Nothing inside to receive focus (a still-loading state) — keep
        // it on the dialog container itself rather than letting Tab
        // escape to the page behind it.
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
      // Return focus to whatever opened this drawer — without this, a
      // keyboard user's focus silently drops to <body> on close, the same
      // "where am I now" disorientation the initial-focus half of this fix
      // addresses on open.
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-surface shadow-pop focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-md px-2 py-1 text-ink-muted hover:bg-surface-sunk hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </div>
    </div>
  );
}
