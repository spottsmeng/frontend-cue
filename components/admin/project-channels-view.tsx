"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  useAttachChannelMutation,
  useChannelHealthHistoryQuery,
  useChannelTypesQuery,
  useChannelsQuery,
  useDetachChannelMutation,
  useReconnectChannelMutation,
  useWhatsAppConversationsQuery,
} from "@/lib/admin/channels-hooks";
import { formatDateTime } from "@/lib/format";

import { SectionPanel } from "../living-wip/section-panel";

/**
 * WHAT TO BUILD #4 ("Layer B Channel Picker" prompt): list/attach/detach,
 * health history, reconnect, per project. `type` is populated from
 * `GET /channel-types`, not a hardcoded list (FR-ADM-06/`ChannelCreate.type`'s
 * own validated-at-request-time contract, Prompt F7's own NON-OBVIOUS note).
 * Health history is polled on an interval TanStack Query controls
 * (`useChannelHealthHistoryQuery`'s own `refetchInterval`), never rendered
 * as a spinner implying a live socket — there is no push mechanism to this
 * UI.
 *
 * For `type="whatsapp"` specifically, the attach form's `external_ref`
 * input is replaced by a real, name-searchable picker backed by
 * `GET .../channels/whatsapp/conversations` — WhatsApp never shows a human
 * its own group JID anywhere in its own UI, so a hand-typed `external_ref`
 * for this channel type was never actually fillable by a real PM. Every
 * other channel type keeps the generic free-text field (no discovery
 * mechanism exists for them yet, out of scope this session).
 */
export function ProjectChannelsView({ projectId }: { projectId: string }) {
  const t = useTranslations("admin.channels");
  const { data: channels, isLoading } = useChannelsQuery(projectId);
  const { data: channelTypes } = useChannelTypesQuery();
  const attachMutation = useAttachChannelMutation(projectId);
  const detachMutation = useDetachChannelMutation(projectId);
  const reconnectMutation = useReconnectChannelMutation(projectId);

  const [type, setType] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [selectedJid, setSelectedJid] = useState<string | null>(null);

  const { data: history } = useChannelHealthHistoryQuery(projectId, expandedChannel);

  const isWhatsApp = type === "whatsapp";
  const {
    data: conversations,
    isLoading: conversationsLoading,
    isError: conversationsErrored,
  } = useWhatsAppConversationsQuery(projectId, isWhatsApp);

  const filteredConversations = useMemo(() => {
    const list = conversations ?? [];
    const query = conversationSearch.trim().toLowerCase();
    if (!query) return list;
    return list.filter((c) => (c.name ?? "").toLowerCase().includes(query));
  }, [conversations, conversationSearch]);

  const selectedConversation = conversations?.find((c) => c.jid === selectedJid) ?? null;

  /** Just the picker/free-text fields — used when the channel *type*
   * itself changes, where `type` is about to be set to something new by
   * the caller and must not be clobbered back to "" here. */
  function resetPickerFields() {
    setExternalRef("");
    setSelectedJid(null);
    setConversationSearch("");
  }

  /**
   * A successful attach clears the whole form back to its neutral state,
   * `type` included — not just the picker's own selection. Leaving
   * `type="whatsapp"` selected with the picker still populated would show
   * the conversation just attached as pickable again (its `designated`
   * flag has genuinely flipped to `true` by the time the list re-fetches,
   * but nothing stops a second click re-submitting the same jid — the
   * backend's own `add()` is idempotent, so no error, but a second local
   * `Channel` row for the same conversation is a real, avoidable
   * duplicate). Resetting `type` also removes the only real ambiguity in
   * this screen's own markup: the attached-channels list above and the
   * picker's own conversation list below can otherwise both contain an
   * `<li>` for the same name at once.
   */
  function resetAttachForm() {
    setType("");
    resetPickerFields();
  }

  const canSubmit = type !== "" && (isWhatsApp ? selectedJid !== null : true);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel title={t("title")}>
        {isLoading && <p className="text-sm text-ink-muted">{t("loading")}</p>}
        {channels && channels.length === 0 && (
          <p className="mb-3 text-sm text-ink-muted">{t("empty")}</p>
        )}
        {channels && channels.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1.5">
            {channels.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink">
                    {c.type}
                    {/* No raw id rendered for a human here — a channel attached
                        through the picker always carries a resolved
                        display_name; a channel type with no discovery
                        mechanism (its external_ref is a human-typed mailbox/
                        drive id to begin with, never an opaque platform id)
                        still shows it directly, same as before. */}
                    {c.display_name && (
                      <span className="ml-1.5 text-ink-secondary">{c.display_name}</span>
                    )}
                    {!c.display_name && c.type !== "whatsapp" && c.external_ref && (
                      <span className="ml-1.5 font-mono text-xs text-ink-muted">{c.external_ref}</span>
                    )}
                    {!c.display_name && c.type === "whatsapp" && c.external_ref && (
                      <span className="ml-1.5 text-xs text-ink-muted">{t("picker.unresolvedName")}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.healthy ? "bg-good-soft text-good" : "bg-critical-soft text-critical"
                      }`}
                    >
                      {c.healthy ? t("healthy") : t("degraded")}
                    </span>
                    {!c.healthy && (
                      <button
                        type="button"
                        disabled={reconnectMutation.isPending}
                        onClick={() => reconnectMutation.mutate(c.id)}
                        className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal disabled:opacity-50"
                      >
                        {t("reconnect")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedChannel(expandedChannel === c.id ? null : c.id)}
                      className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal"
                    >
                      {expandedChannel === c.id ? t("hideHistory") : t("healthHistory")}
                    </button>
                    <Link
                      href={`/admin/projects/${projectId}/channels/${c.id}/messages`}
                      className="rounded-md border border-border-strong px-2 py-1 text-xs text-ink-secondary hover:border-signal"
                    >
                      {t("debug.viewMessages")}
                    </Link>
                    <button
                      type="button"
                      disabled={detachMutation.isPending}
                      onClick={() => {
                        if (expandedChannel === c.id) setExpandedChannel(null);
                        detachMutation.mutate(c.id);
                      }}
                      className="rounded-md border border-border-strong px-2 py-1 text-xs text-critical hover:border-critical disabled:opacity-50"
                    >
                      {t("detach")}
                    </button>
                  </span>
                </div>
                {detachMutation.isError && detachMutation.variables === c.id && (
                  <p className="mt-1.5 text-xs text-critical">{t("detachError")}</p>
                )}
                {expandedChannel === c.id && (
                  <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                    {(history ?? []).length === 0 && (
                      <li className="text-xs text-ink-muted">{t("noHealthChecks")}</li>
                    )}
                    {(history ?? []).map((h) => (
                      <li key={h.id} className="font-mono text-xs text-ink-muted">
                        {formatDateTime(h.checked_at)} — {h.healthy ? t("healthy") : t("unhealthy")}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            const body = isWhatsApp
              ? { type, external_ref: selectedJid, display_name: selectedConversation?.name ?? null }
              : { type, external_ref: externalRef || null };
            attachMutation.mutate(body, { onSuccess: resetAttachForm });
          }}
          className="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-ink-secondary">
              {t("channelTypeLabel")}
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  resetPickerFields();
                }}
                className="mt-1 block w-48 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
              >
                <option value="">{t("selectPlaceholder")}</option>
                {channelTypes?.map((ct) => (
                  <option key={ct.code} value={ct.code}>
                    {ct.code}
                  </option>
                ))}
              </select>
            </label>
            {!isWhatsApp && (
              <label className="text-xs text-ink-secondary">
                {t("externalRefLabel")}
                <input
                  type="text"
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  placeholder={t("externalRefPlaceholder")}
                  className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
                />
              </label>
            )}
            {!isWhatsApp && (
              <button
                type="submit"
                disabled={!canSubmit || attachMutation.isPending}
                className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {t("attachChannel")}
              </button>
            )}
          </div>

          {isWhatsApp && (
            <div className="flex flex-col gap-2 rounded-md border border-border-strong bg-surface-sunk p-2.5">
              <label className="text-xs text-ink-secondary">
                {t("picker.searchLabel")}
                <input
                  type="text"
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  placeholder={t("picker.searchPlaceholder")}
                  className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
                />
              </label>

              {conversationsLoading && <p className="text-xs text-ink-muted">{t("picker.loading")}</p>}
              {conversationsErrored && <p className="text-xs text-critical">{t("picker.error")}</p>}
              {!conversationsLoading && !conversationsErrored && filteredConversations.length === 0 && (
                <p className="text-xs text-ink-muted">{t("picker.empty")}</p>
              )}

              {!conversationsLoading && filteredConversations.length > 0 && (
                <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                  {filteredConversations.map((c) => (
                    <li key={c.jid}>
                      <button
                        type="button"
                        onClick={() => setSelectedJid(c.jid)}
                        className={`flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-sm ${
                          selectedJid === c.jid
                            ? "border-signal bg-signal-soft text-ink"
                            : "border-border bg-surface text-ink hover:border-border-strong"
                        }`}
                      >
                        <span className="flex flex-col">
                          <span>{c.name ?? t(c.kind === "group" ? "picker.unnamedGroup" : "picker.unnamedContact")}</span>
                          <span className="text-xs text-ink-muted">
                            {t(c.kind === "group" ? "picker.kindGroup" : "picker.kindContact")}
                          </span>
                        </span>
                        {c.designated && (
                          <span className="shrink-0 rounded-full bg-good-soft px-2 py-0.5 text-xs font-medium text-good">
                            {t("picker.alreadyDesignated")}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {selectedConversation && (
                <p className="text-xs text-ink-secondary">
                  {t("picker.selected", {
                    name:
                      selectedConversation.name ??
                      t(selectedConversation.kind === "group" ? "picker.unnamedGroup" : "picker.unnamedContact"),
                  })}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit || attachMutation.isPending}
                className="self-start rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {t("attachChannel")}
              </button>
            </div>
          )}

          {attachMutation.isError && (
            <p className="w-full text-xs text-critical">{t("attachError")}</p>
          )}
        </form>
      </SectionPanel>
    </div>
  );
}
