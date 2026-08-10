import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

const API_URL = process.env.NEXT_PUBLIC_CUE_API_URL ?? "http://localhost:8000";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Organisation ID").fill(seed.organisationId);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /sign in/i }).click();
  // e2e/admin.spec.ts's own FR-ADM-06 provisioning test can add a real
  // second project to this shared seed within one Playwright invocation —
  // once that's happened, "/" no longer auto-redirects
  // (app/(shell)/page.tsx's `list.length === 1` check), so pick the known
  // seeded project by name from the picker if landed there instead.
  await page.waitForURL((url) => url.pathname !== "/login");
  await page.waitForLoadState("networkidle");
  if (page.url().endsWith("/")) {
    await page.getByRole("link", { name: "CUE Dev Project" }).click();
  }
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  await page.goto(page.url() + "/foresight");
  await expect(page.getByRole("heading", { name: "Risks" })).toBeVisible();
}

/**
 * F3's own TESTING EXPECTATION, against the real backend seeded by
 * scripts/seed_dev_data.py (no mocks — frontend/CLAUDE.md's testing
 * philosophy). This milestone's own script extension inserts Risk/
 * Deviation/Notification rows directly via the ORM (same pattern
 * loadtest/seed.py uses) rather than waiting on the arq worker's real
 * periodic sweeps, which is what that script's own F3 comment documents.
 *
 * `describe.serial`: later tests build on earlier ones' UI state within the
 * same login/navigation pattern, same reasoning twin.spec.ts's own
 * describe.serial gives.
 */
test.describe.serial("Foresight (F3)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, seed.email);
  });

  test("filters the risk feed by severity, server-side", async ({ page }) => {
    const risksSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Risks" }) });
    await expect(risksSection.getByText(/Golden Sound & Light has gone quiet/)).toBeVisible();
    await expect(risksSection.getByText(/Content load into screens has fallen/)).toBeVisible();

    await risksSection.getByLabel("Severity").selectOption("critical");

    await expect(risksSection.getByText(/Content load into screens has fallen/)).toBeVisible();
    await expect(risksSection.getByText(/Golden Sound & Light has gone quiet/)).not.toBeVisible();
  });

  test("leads every risk card with its downstream consequence and renders base_rate honestly", async ({
    page,
  }) => {
    const risksSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Risks" }) });
    const silenceCard = risksSection.locator("li", { hasText: "Golden Sound & Light has gone quiet" });
    await expect(silenceCard).toContainText("historical base rate 80%");

    const forecastCard = risksSection.locator("li", { hasText: "Content load into screens has fallen" });
    await expect(forecastCard).toContainText("not enough history yet");
  });

  test("acknowledging a risk pauses escalation without implying it's resolved, and a stale double-acknowledge still converges to the real status", async ({
    page,
  }) => {
    const risksSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Risks" }) });
    const card = risksSection.locator("li", { hasText: "Golden Sound & Light has gone quiet" });
    await expect(card.getByText("Open", { exact: true })).toBeVisible();
    await expect(card).toContainText("Acknowledging only pauses escalation");

    // Simulates "someone else already resolved this before you clicked" —
    // an out-of-band resolve via the real API, using this same session's
    // own bearer token (Auth.js's session endpoint carries it, same field
    // lib/api/client.ts attaches to every request), landing behind this
    // page's already-rendered, now-stale "Open" card. `acknowledge_risk`
    // itself is idempotent on an already-acknowledged risk (app/api/
    // risks.py: `if risk.status not in ("open", "acknowledged")`) — only
    // `resolved`/`superseded` actually 409, confirmed by reading that guard
    // directly rather than assumed, so resolving (not acknowledging) is
    // what's needed to genuinely trigger the race this test is after.
    const session = (await (await page.request.get("/api/auth/session")).json()) as {
      accessToken: string;
    };
    const projectId = page.url().match(/projects\/([^/]+)/)![1];
    const risks = (await (
      await page.request.get(`${API_URL}/projects/${projectId}/risks?source=silence`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
    ).json()) as { id: string; status: string }[];
    const riskId = risks[0].id;
    const outOfBandResolve = await page.request.post(
      `${API_URL}/projects/${projectId}/risks/${riskId}/resolve`,
      { headers: { Authorization: `Bearer ${session.accessToken}` } },
    );
    expect(outOfBandResolve.status()).toBe(200);

    // This milestone's own NON-OBVIOUS note: "a 409 on acknowledge/resolve
    // means the status already moved ... refetch and show the risk's
    // actual current status." The card above still shows the pre-race
    // "Open" state; clicking its own (stale) Acknowledge button now hits
    // app/api/risks.py's 409 ("cannot acknowledge a resolved risk"), but
    // the mutation's onSettled refetches regardless of outcome
    // (lib/foresight/hooks.ts), so the UI must converge on the real
    // "Resolved" state — never a stuck stale "Open" or a dangling error.
    await card.getByRole("button", { name: "Acknowledge — pause escalation" }).click();
    await expect(card.getByText("Resolved", { exact: true })).toBeVisible();
    await expect(card).toContainText("current status");
    await expect(card.getByRole("button", { name: "Acknowledge — pause escalation" })).toHaveCount(0);
  });

  test("confirming an auto-drafted deviation as-is marks it confirmed, and its class renders as a real label", async ({
    page,
  }) => {
    const deviationsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Deviations" }) });
    const row = deviationsSection.locator("li", {
      hasText: "Vendor's quoted LED wall spec drifted",
    });
    await expect(row.getByText("Auto-drafted — needs review")).toBeVisible();

    // backend/PROGRESS.md's "round 3" fix: OntologyTermOut now carries a
    // real `id`, so this renders the resolved deviation_class label — never
    // the bare class_term_id UUID the pre-fix version showed.
    await expect(row.getByText("Spec drift / contradiction")).toBeVisible();
    await expect(row.getByText(/^class [0-9a-f]{8}-/)).toHaveCount(0);

    await row.getByRole("button", { name: "Confirm as-is" }).click();

    await expect(row.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "Confirm as-is" })).toHaveCount(0);
  });

  test("records a deviation resolution by picking a real project member, not pasting a UUID", async ({
    page,
  }) => {
    const deviationsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Deviations" }) });
    const row = deviationsSection.locator("li", {
      hasText: "Rigging crew call time slipped two hours",
    });
    await expect(row.getByText("Confirmed", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Record resolution" }).click();
    await row.getByLabel("Resolution date").fill("2026-08-15");

    // backend/PROGRESS.md's "round 3" fix: GET /projects/{id}/members backs
    // a real <select> of names now, not a free-text UUID input.
    const ownerSelect = row.getByLabel("Owner");
    await expect(ownerSelect.locator("option")).toHaveCount(9); // placeholder + 8 seeded roles
    await ownerSelect.selectOption({ label: "Producer — producer" });
    await row.getByRole("button", { name: "Save resolution" }).click();

    await expect(row.getByText(/Resolved for .* owner Producer/)).toBeVisible();
    await expect(row.getByRole("button", { name: "Record resolution" })).toHaveCount(0);
  });

  test("shows a webhook's signing secret exactly once, absent from the list afterward", async ({ page }) => {
    const webhookSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Webhook subscriptions" }) });
    await webhookSection.scrollIntoViewIfNeeded();

    const url = `https://example.com/cue-webhook-${Date.now()}`;
    await webhookSection.getByLabel("URL").fill(url);
    await webhookSection.getByRole("checkbox", { name: "risk" }).check();
    await webhookSection.getByRole("button", { name: "Create webhook" }).click();

    const dialog = page.locator('[role="dialog"][aria-label="Webhook signing secret"]');
    await expect(dialog).toBeVisible();
    const secretText = await dialog.locator("code").innerText();
    expect(secretText.length).toBeGreaterThan(20);

    await dialog.getByRole("button", { name: /Done/ }).click();
    await expect(dialog).toHaveCount(0);

    // Not just gone from the dialog — absent from a fresh GET .../webhooks
    // response too (WebhookSubscriptionOut never carries `secret` at all).
    await page.reload();
    const reloadedSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Webhook subscriptions" }) });
    await expect(reloadedSection.getByText(url)).toBeVisible();
    await expect(page.getByText(secretText)).toHaveCount(0);
  });

  test("a project-scoped threshold override narrows the org default, verified by reading it back", async ({
    page,
  }) => {
    const thresholdSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Foresight thresholds" }) });
    await thresholdSection.scrollIntoViewIfNeeded();

    await thresholdSection.getByLabel("Metric").selectOption("silence_multiplier");
    await thresholdSection.getByLabel("Scope").selectOption("project");
    await thresholdSection.getByLabel("Value").fill("5");
    await thresholdSection.getByRole("button", { name: "Add override" }).click();

    await expect(thresholdSection.getByText("This project's overrides")).toBeVisible();

    // Verify by reading the config back (a reload re-fetches
    // GET /admin/foresight-thresholds from scratch), not by inferring the
    // POST succeeded from the optimistic UI alone.
    await page.reload();
    const reloadedSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Foresight thresholds" }) });
    await expect(reloadedSection.getByText("This project's overrides")).toBeVisible();
    await expect(reloadedSection.locator("li", { hasText: "Silence Radar" }).last().locator("input")).toHaveValue(
      "5",
    );
  });
});
