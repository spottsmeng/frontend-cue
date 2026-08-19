"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AdminPermissionError } from "@/lib/admin/members-hooks";
import { useLayerAAlertConfigQuery, useUpdateLayerAAlertConfigMutation } from "@/lib/admin/layer-a-hooks";
import type { LayerAAlertConfigOut } from "@/lib/api/types";

/** Runtime-editable, not env config — the task's own "configurable
 * duration"/"configurable threshold... configurable short window" language
 * means changeable without a redeploy (see the config's own backend
 * docstring). enabled=false is also the feature's opt-in gate per org. */
export function LayerAAlertConfigPanel() {
  const t = useTranslations("admin.layerA.config");
  const { data: config, isLoading, isError, error } = useLayerAAlertConfigQuery();

  if (isLoading) return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (isError) {
    return (
      <p className="text-sm text-ink-muted">
        {error instanceof AdminPermissionError ? t("adminOnly") : t("loadError")}
      </p>
    );
  }
  if (!config) return null;

  // Keyed by id so a form remount (never actually changes here — one row
  // per org) would re-derive its initial state from fresh props rather
  // than needing an effect to sync it after the fact.
  return <LayerAAlertConfigForm key={config.id} config={config} />;
}

function LayerAAlertConfigForm({ config }: { config: LayerAAlertConfigOut }) {
  const t = useTranslations("admin.layerA.config");
  const updateMutation = useUpdateLayerAAlertConfigMutation();

  const [enabled, setEnabled] = useState(config.enabled);
  const [sustainedDisconnectMinutes, setSustainedDisconnectMinutes] = useState(
    String(config.sustained_disconnect_minutes),
  );
  const [reconnectThreshold, setReconnectThreshold] = useState(
    String(config.reconnect_attempt_threshold),
  );
  const [reconnectWindowMinutes, setReconnectWindowMinutes] = useState(
    String(config.reconnect_attempt_window_minutes),
  );
  const [webhookUrl, setWebhookUrl] = useState(config.webhook_url ?? "");
  const [webhookEnabled, setWebhookEnabled] = useState(config.webhook_enabled);
  const [emailRecipients, setEmailRecipients] = useState(config.email_recipients.join(", "));
  const [emailEnabled, setEmailEnabled] = useState(config.email_enabled);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        updateMutation.mutate({
          enabled,
          sustained_disconnect_minutes: Number(sustainedDisconnectMinutes),
          reconnect_attempt_threshold: Number(reconnectThreshold),
          reconnect_attempt_window_minutes: Number(reconnectWindowMinutes),
          webhook_url: webhookUrl || null,
          webhook_enabled: webhookEnabled,
          email_recipients: emailRecipients
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          email_enabled: emailEnabled,
        });
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t("enabledLabel")}
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs text-ink-secondary">
          {t("sustainedDisconnectMinutesLabel")}
          <input
            type="number"
            min={1}
            value={sustainedDisconnectMinutes}
            onChange={(e) => setSustainedDisconnectMinutes(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("reconnectThresholdLabel")}
          <input
            type="number"
            min={1}
            value={reconnectThreshold}
            onChange={(e) => setReconnectThreshold(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("reconnectWindowMinutesLabel")}
          <input
            type="number"
            min={1}
            value={reconnectWindowMinutes}
            onChange={(e) => setReconnectWindowMinutes(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={webhookEnabled}
            onChange={(e) => setWebhookEnabled(e.target.checked)}
          />
          {t("webhookEnabledLabel")}
        </label>
        <label className="text-xs text-ink-secondary">
          {t("webhookUrlLabel")}
          <input
            type="url"
            placeholder="https://…"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          />
        </label>
        {config.webhook_configured && <p className="text-xs text-ink-muted">{t("webhookConfigured")}</p>}
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) => setEmailEnabled(e.target.checked)}
          />
          {t("emailEnabledLabel")}
        </label>
        <label className="text-xs text-ink-secondary">
          {t("emailRecipientsLabel")}
          <input
            type="text"
            placeholder="ops@example.com, oncall@example.com"
            value={emailRecipients}
            onChange={(e) => setEmailRecipients(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {t("save")}
        </button>
        {updateMutation.isSuccess && <p className="text-xs text-good">{t("saved")}</p>}
        {updateMutation.isError && <p className="text-xs text-critical">{t("saveError")}</p>}
      </div>
    </form>
  );
}
