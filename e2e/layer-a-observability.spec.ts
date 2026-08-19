import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

const API_URL = process.env.NEXT_PUBLIC_CUE_API_URL ?? "http://localhost:8000";

/**
 * task-layer-A-observability-dashboard-prompt.txt's own dashboard — real
 * backend (no mocks, frontend/CLAUDE.md's testing philosophy), same shape
 * e2e/admin.spec.ts already establishes for this suite. Live status is
 * genuinely live (proxied through the backend to whatever Layer A instance
 * this environment has configured, per app/layer_a/client.py) — skips
 * cleanly (not a failure) when unconfigured, the same convention every
 * real-infra check in this codebase already holds itself to
 * (test_channels_whatsapp_live.py's own skipif, admin.spec.ts's WhatsApp
 * picker test). Trend/alert history are asserted as honest empty states
 * here, not seeded — this fresh org's poller has never swept it (the
 * poller's own real-fixture-server contract is
 * backend/tests/test_layer_a_poller.py's job, not this page-level check).
 */
test.describe("Layer A observability dashboard", () => {
  test("renders all four panels, round-trips the alert config form, and shows real live status when configured", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Organisation ID").fill(seed.organisationId);
    await page.getByLabel("Email").fill(seed.email);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login$/);

    await page.goto("/admin/layer-a");
    await expect(page.getByRole("heading", { name: "Live status" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Historical trend" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alert history" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alert configuration" })).toBeVisible();

    // Fresh org — no alerts have ever fired, no trend history has ever
    // been polled. Honest empty states, not fabricated data.
    await expect(page.getByText("No alerts have fired yet.")).toBeVisible();

    // The config form round-trips through the real backend — enable the
    // feature and set a distinctive threshold, then confirm it survives a
    // reload (read back from Postgres, not just the optimistic UI).
    await page.getByLabel("Enable Layer A observability alerts for this organisation").check();
    await page.getByLabel("Sustained disconnect threshold (minutes)").fill("7");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.reload();
    await expect(
      page.getByLabel("Enable Layer A observability alerts for this organisation"),
    ).toBeChecked();
    await expect(page.getByLabel("Sustained disconnect threshold (minutes)")).toHaveValue("7");

    // Live status: real per this environment's own CUE_LAYERA_ADMIN_* —
    // detected via the accounts endpoint's own 503 ("not configured") vs
    // 200, not an env var this file can't see, same pattern the WhatsApp
    // picker test in admin.spec.ts already uses for the same reason.
    const session = (await (await page.request.get("/api/auth/session")).json()) as {
      accessToken: string;
    };
    const probe = await page.request.get(`${API_URL}/admin/layer-a/accounts`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    test.skip(probe.status() === 503, "Layer A admin credentials not configured in this environment");
    expect(probe.ok()).toBe(true);
    const accounts = (await probe.json()) as {
      accountId: string;
      displayName: string | null;
      status: string;
    }[];
    test.skip(accounts.length === 0, "Layer A is configured but has no accounts to show");

    const liveStatusPanel = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Live status" }) });
    await expect(
      liveStatusPanel.getByText(accounts[0]!.displayName ?? accounts[0]!.accountId),
    ).toBeVisible();
  });
});
