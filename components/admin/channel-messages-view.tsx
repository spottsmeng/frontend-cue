"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import {
  useChannelCaptureStatusQuery,
  useChannelMessagesQuery,
  useChannelsQuery,
  usePullChannelNowMutation,
} from "@/lib/admin/channels-hooks";
import { formatDateTime } from "@/lib/format";

import { SectionPanel } from "../living-wip/section-panel";

/**
 * The capture debug console — a real, admin-gated page (same `ADMIN_ROLES`
 * tier the rest of this router already enforces server-side) showing raw
 * `Message` rows for one channel, independent of extraction: a message
 * shows up here the moment capture durably writes it, whether or not
 * extraction has run or produced anything.
 *
 * "Pull now" enqueues the real arq ingestion job and returns immediately —
 * there is no push mechanism to this UI, but unlike a bare "runs in the
 * background, refresh in a moment" message (this view's own first draft,
 * corrected after real user feedback that it left no way to tell "still
 * running" from "stuck" from "done"), the real job state is polled every
 * 2s via `useChannelCaptureStatusQuery` and rendered as an explicit status:
 * queued → in progress → done (with the real result counts) or failed
 * (with the real error) — polling stops itself the moment the job
 * resolves. The messages list also re-fetches itself automatically the
 * moment a pull completes successfully, not just on a manual click.
 */
export function ChannelMessagesView({ projectId, channelId }: { projectId: string; channelId: string }) {
  const t = useTranslations("admin.channels");
  const { data: channels } = useChannelsQuery(projectId);
  const channel = channels?.find((c) => c.id === channelId);

  const {
    data: messages,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useChannelMessagesQuery(projectId, channelId);
  const captureStatus = useChannelCaptureStatusQuery(projectId, channelId);
  const pullNowMutation = usePullChannelNowMutation(projectId);

  const channelLabel = channel?.display_name ?? channel?.type ?? channelId;

  // Re-fetch the messages list itself the moment a pull's real status
  // transitions into "complete" with a real success — no manual "Refresh"
  // click required to see the result. Only fires on the transition (via
  // the previous-status ref), not on every poll tick while already
  // complete, so this doesn't refetch messages repeatedly for no reason.
  const previousStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const status = captureStatus.data?.status;
    if (status === "complete" && previousStatus.current !== "complete" && captureStatus.data?.success) {
      refetch();
    }
    previousStatus.current = status;
  }, [captureStatus.data?.status, captureStatus.data?.success, refetch]);

  const status = captureStatus.data;
  let statusBanner: { tone: "progress" | "success" | "error"; text: string } | null = null;
  if (status?.status === "queued" || status?.status === "deferred") {
    statusBanner = { tone: "progress", text: t("debug.statusQueued") };
  } else if (status?.status === "in_progress") {
    statusBanner = { tone: "progress", text: t("debug.statusInProgress") };
  } else if (status?.status === "complete" && status.success && status.skipped) {
    statusBanner = { tone: "error", text: t("debug.statusSkipped", { reason: status.skip_reason ?? "" }) };
  } else if (status?.status === "complete" && status.success) {
    statusBanner = {
      tone: "success",
      text: t("debug.statusComplete", {
        newMessages: status.new_messages ?? 0,
        duplicates: status.duplicates ?? 0,
      }),
    };
  } else if (status?.status === "complete" && !status.success) {
    statusBanner = { tone: "error", text: t("debug.statusFailed", { error: status.error ?? "" }) };
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <Link
        href={`/admin/projects/${projectId}/channels`}
        className="text-sm text-ink-muted hover:text-signal"
      >
        {t("debug.back")}
      </Link>

      <SectionPanel
        title={t("debug.title", { channel: channelLabel })}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
            >
              {t("debug.refresh")}
            </button>
            <button
              type="button"
              disabled={
                pullNowMutation.isPending ||
                status?.status === "queued" ||
                status?.status === "deferred" ||
                status?.status === "in_progress"
              }
              onClick={() => pullNowMutation.mutate(channelId)}
              className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {pullNowMutation.isPending ? t("debug.pulling") : t("debug.pullNow")}
            </button>
          </div>
        }
      >
        {statusBanner && (
          <p
            className={`mb-3 flex items-center gap-2 rounded-md px-2.5 py-2 text-xs ${
              statusBanner.tone === "progress"
                ? "bg-signal-soft text-signal"
                : statusBanner.tone === "success"
                  ? "bg-good-soft text-good"
                  : "bg-critical-soft text-critical"
            }`}
          >
            {statusBanner.tone === "progress" && (
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-signal" aria-hidden />
            )}
            {statusBanner.text}
          </p>
        )}
        {pullNowMutation.isError && (
          <p className="mb-3 text-xs text-critical">{t("debug.pullError")}</p>
        )}

        {isLoading && <p className="text-sm text-ink-muted">{t("loading")}</p>}
        {isError && <p className="text-sm text-critical">{t("debug.loadError")}</p>}
        {messages && messages.length === 0 && (
          <p className="text-sm text-ink-muted">{t("debug.empty")}</p>
        )}

        {messages && messages.length > 0 && (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <li key={m.id} className="rounded-md border border-border p-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                  <span className="font-mono">{m.sender_external_id}</span>
                  <span className="font-mono">{formatDateTime(m.sent_at)}</span>
                </div>
                {m.text ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-ink" lang={m.language ?? undefined}>
                    {m.text}
                  </p>
                ) : (
                  <p className="mt-1.5 text-ink-muted italic">{t("debug.noText")}</p>
                )}
                <span
                  className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.extraction_attempted_at
                      ? "bg-good-soft text-good"
                      : "bg-warning-soft text-warning"
                  }`}
                >
                  {m.extraction_attempted_at ? t("debug.extractionDone") : t("debug.extractionPending")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    </div>
  );
}
