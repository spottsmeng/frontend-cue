import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

// `seed.email` (global-setup.ts) is always the administrator's own address
// — not usable here, since `administrator` is in WRITE_ROLES (needed to
// confirm in Living WIP) but not FINANCE_ROLES (needed for the Vendor
// Reliability Graph). `producer` is the one role in both sets
// (lib/roles.ts), so this spec needs its own derived login, the same
// `{role}+{org_id.hex[:8]}@cue.dev` pattern e2e/vendors.spec.ts already
// established for the identical reason.
const orgSuffix = seed.organisationId.replace(/-/g, "").slice(0, 8);
const producerEmail = `producer+${orgSuffix}@cue.dev`;

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
}

/**
 * FR-LED-05: the AI-proposes/human-confirms supersession review, end to
 * end, against the real backend (no mocks — frontend/CLAUDE.md's testing
 * philosophy). `scripts/seed_dev_data.py` seeds a real revision pair on
 * "Nimbus Event Staffing Pte Ltd" ("Event day staffing crew", 4,200 ->
 * 5,100 SGD) and calls the real `propose_supersession_candidates` — real
 * Ollama locally, `FakeClient` (app/llm/client.py's own supersession
 * branch) in CI, both making an honest amount-comparison judgment rather
 * than an unconditional "yes". Deliberately a *different* vendor from
 * "Golden Sound & Light Pte Ltd" (e2e/vendors.spec.ts's own subject) — a
 * real cross-spec interaction this session's own test run caught: both
 * spec files share one seeded org for the whole Playwright invocation, and
 * confirming a candidate on the same vendor F6's suite asserts stays
 * `unavailable` would make that other, earlier-written assertion false
 * depending on run order. Separate vendors keep both fixtures independent
 * regardless of which spec file Playwright happens to run first.
 *
 * The whole point of this feature — F6's own "revision_churn/price_drift_pct
 * always Not available" gap, genuinely closed rather than hidden or
 * narrated around — is proven by the second test below reading real numbers
 * back from the Vendor Reliability Graph after a real confirm, not by
 * asserting on the confirm response alone.
 */
test.describe.serial("Commitment supersession review (FR-LED-05)", () => {
  test("a pending revision candidate is visible in Living WIP with a real reasoning and real amounts", async ({
    page,
  }) => {
    await login(page, producerEmail);

    const panel = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Commitment revisions" }) });
    await expect(panel.getByText("Event day staffing crew").first()).toBeVisible();
    await expect(panel.getByText(/4,200/)).toBeVisible();
    await expect(panel.getByText(/5,100/)).toBeVisible();
    await expect(panel.getByRole("button", { name: /Confirm — this is a revision/ })).toBeVisible();
    await expect(panel.getByRole("button", { name: /Reject — unrelated commitments/ })).toBeVisible();
  });

  test("confirming the candidate makes revision_churn/price_drift_pct genuinely available on the Vendor Reliability Graph", async ({
    page,
  }) => {
    await login(page, producerEmail);

    const panel = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Commitment revisions" }) });
    const row = panel.locator("li", { hasText: "Event day staffing crew" });
    await row.getByRole("button", { name: /Confirm — this is a revision/ }).click();
    await expect(row.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: /Confirm — this is a revision/ })).toHaveCount(0);

    await page.goto("/vendors");
    await page.getByRole("link", { name: "Nimbus Event Staffing Pte Ltd" }).click();
    const metrics = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Reliability metrics" }) });

    const revisionChurn = metrics.locator("li", { hasText: "Revision churn" });
    await expect(revisionChurn.getByText("Not available")).toHaveCount(0);
    await expect(revisionChurn.getByText("%")).toBeVisible();

    const priceDrift = metrics.locator("li", { hasText: "Price drift" });
    await expect(priceDrift.getByText("Not available")).toHaveCount(0);
    await expect(priceDrift.getByText("%")).toBeVisible();
  });
});
