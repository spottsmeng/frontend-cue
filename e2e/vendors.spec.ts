import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

// scripts/seed_dev_data.py mints every role's email as
// `{role}+{org_id.hex[:8]}@cue.dev` — `seed.email` (global-setup.ts) only
// ever captures the administrator's own address, so the finance/
// project_manager addresses this spec needs are derived the same way the
// seed script built them, not hardcoded against a guess.
const orgSuffix = seed.organisationId.replace(/-/g, "").slice(0, 8);
const financeEmail = `finance+${orgSuffix}@cue.dev`;
const pmEmail = `project_manager+${orgSuffix}@cue.dev`;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Organisation ID").fill(seed.organisationId);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
}

/**
 * F6's own TESTING EXPECTATION, against the real backend seeded by
 * scripts/seed_dev_data.py (no mocks — frontend/CLAUDE.md's testing
 * philosophy). This milestone's own seed extension gives "Golden Sound &
 * Light Pte Ltd" real, computed reliability data (median_response_time_days
 * and on_time_rate genuinely available, revision_churn/price_drift_pct
 * genuinely unavailable per FR-LED-05, two real VendorMetric history
 * snapshots) and adds a second vendor plus a person-type contact mapped to
 * the first (FR-NRM-04) — see frontend/PROGRESS.md's F6 notes and
 * backend/scripts/seed_dev_data.py's own comments for the exact numbers.
 *
 * `describe.serial`: every test here is read-only against the shared seed
 * (no mutation), but each still depends on a prior test's login/navigation
 * pattern, same reasoning every other e2e spec in this suite already gives
 * for `describe.serial`.
 */
test.describe.serial("Vendor Reliability Graph (F6)", () => {
  test("a Finance-role user sees the Vendors nav entry and the real vendor directory", async ({
    page,
  }) => {
    await login(page, financeEmail);
    await expect(page.getByRole("link", { name: "Vendors" })).toBeVisible();

    await page.getByRole("link", { name: "Vendors" }).click();
    await expect(page.getByRole("heading", { name: "Vendor directory" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Golden Sound & Light Pte Ltd" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nimbus Event Staffing Pte Ltd" })).toBeVisible();
  });

  test("a project_manager-only user has the nav entry hidden, and the route itself 403s on direct navigation", async ({
    page,
  }) => {
    await login(page, pmEmail);
    await expect(page.getByRole("link", { name: "Vendors" })).toHaveCount(0);

    // The real gate is the backend's 403 (F0's own "UX nicety, not a
    // security boundary" position), not just a hidden nav entry — verified
    // by navigating to the URL directly, bypassing the nav entirely.
    await page.goto("/vendors");
    await expect(page.getByText(/Finance\/Procurement only/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Golden Sound & Light Pte Ltd" })).toHaveCount(0);
  });

  test("a vendor's current metrics show a genuinely available metric alongside the two FR-LED-05-blocked ones, each with its real unavailable_reason", async ({
    page,
  }) => {
    await login(page, financeEmail);
    await page.goto("/vendors");
    await page.getByRole("link", { name: "Golden Sound & Light Pte Ltd" }).click();
    await expect(page.getByRole("heading", { name: "Golden Sound & Light Pte Ltd" })).toBeVisible();

    const metrics = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Reliability metrics" }) });
    await expect(metrics.getByText("On-time rate")).toBeVisible();
    await expect(metrics.getByText("50%")).toBeVisible();

    await expect(metrics.getByText("Revision churn")).toBeVisible();
    await expect(metrics.getByText("Price drift")).toBeVisible();
    const unavailable = metrics.getByText("Not available");
    await expect(unavailable).toHaveCount(2);
    await expect(metrics.getByText(/FR-LED-05/)).toHaveCount(2);
  });

  test("the history view shows more than one real snapshot for the same vendor/metric", async ({
    page,
  }) => {
    await login(page, financeEmail);
    await page.goto("/vendors");
    await page.getByRole("link", { name: "Golden Sound & Light Pte Ltd" }).click();

    const history = page.locator("section").filter({ has: page.getByRole("heading", { name: "History" }) });
    // MetricHistoryChart defaults to on_time_rate — the seed's own two
    // recompute_vendor_metrics calls (1/1 then 1/2) give it a real,
    // two-point trend without needing to change the metric picker.
    await expect(history.getByText("100%")).toBeVisible();
    await expect(history.getByText("50%")).toBeVisible();
    await expect(history.locator("li")).toHaveCount(2);
  });
});
