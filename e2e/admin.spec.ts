import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

const API_URL = process.env.NEXT_PUBLIC_CUE_API_URL ?? "http://localhost:8000";

// scripts/seed_dev_data.py mints every role's email as
// `{role}+{org_id.hex[:8]}@cue.dev` (vendors.spec.ts's own precedent for
// deriving this rather than hardcoding a guess).
const orgSuffix = seed.organisationId.replace(/-/g, "").slice(0, 8);
const pmEmail = `project_manager+${orgSuffix}@cue.dev`;
const financeEmail = `finance+${orgSuffix}@cue.dev`;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Organisation ID").fill(seed.organisationId);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Not `/\/projects\/[^/]+$/` — this suite's own first test provisions a
  // *second* real project in the org, so "/" no longer auto-redirects to a
  // sole project afterward (app/(shell)/page.tsx's own `length === 1`
  // check) and shows the multi-project picker instead. Every test below
  // navigates straight to its own /admin/... URL regardless, so all this
  // needs to confirm is that sign-in actually landed past /login.
  await expect(page).not.toHaveURL(/\/login$/);
}

/**
 * F7's own TESTING EXPECTATION, against the real backend seeded by
 * scripts/seed_dev_data.py (no mocks — frontend/CLAUDE.md's testing
 * philosophy). `seed.email` is the administrator role fixture
 * (global-setup.ts only ever captures that one), the tier every screen in
 * this console runs at.
 *
 * `describe.serial`: this suite provisions its own real project in the
 * first test and every later test acts on that same project — a genuine
 * dependency chain, not just a shared login pattern, same reasoning
 * supersession.spec.ts's own describe.serial gives for a similar
 * create-then-act-on-it flow. Deliberately provisions a *new* project for
 * every mutating check (channels/consent/budget) rather than touching the
 * shared seeded project other spec files already make assertions against
 * (living-wip.spec.ts's own budget baseline, vendors.spec.ts's own channel/
 * party fixtures) — the exact cross-spec-file interaction backend/
 * PROGRESS.md's "round 6" notes already document a real instance of.
 */
test.describe.serial("Admin console (F7)", () => {
  let projectId: string;

  test("provisions a new project with an initial member in one flow, one submit — FR-ADM-06's 10-minute bar", async ({
    page,
  }) => {
    // The bar itself (§6.14's own "under 10 minutes") is a human manual
    // click-through timing, recorded in frontend/PROGRESS.md's F7 notes —
    // an automated run's own elapsed time isn't that measurement. What
    // this test actually proves is the *shape* the bar depends on: one
    // form, one submit, provisioning and initial team access together,
    // never a second "now add people" request.
    await login(page, seed.email);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin console" })).toBeVisible();

    await page.getByLabel("Project name").fill("F7 E2E Project");
    await page.getByLabel("Email").fill(pmEmail);
    await page.getByRole("button", { name: "Add to team" }).click();
    await expect(page.getByText(`${pmEmail} — Project Manager`)).toBeVisible();

    // A finance-role member too — the Budget screen's own
    // FR-ADM-11 baseline/revise write is Finance/Producer-only
    // (app/api/budget.py's FINANCE_ROLES), a genuinely different tier from
    // the administrator role this whole console otherwise runs at; this
    // spec's own later budget test logs in as this member specifically.
    await page.getByLabel("Email").fill(financeEmail);
    await page.getByLabel("Role").selectOption("finance");
    await page.getByRole("button", { name: "Add to team" }).click();
    await expect(page.getByText(`${financeEmail} — Finance`)).toBeVisible();

    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+$/);

    projectId = page.url().match(/projects\/([^/]+)/)![1];
    // The creator's own automatic administrator membership, plus both
    // team-access rows from the same submit — all real, neither a second
    // request (ProjectCreate.members, app/api/projects.py).
    const membersSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Members" }) });
    await expect(membersSection.getByText(seed.email)).toBeVisible();
    await expect(membersSection.getByText(pmEmail)).toBeVisible();
    await expect(membersSection.getByText(financeEmail)).toBeVisible();
  });

  test("attaches a channel, sees an honest empty health history, and reconnects it after a real degraded report", async ({
    page,
  }) => {
    await login(page, seed.email);
    await page.goto(`/admin/projects/${projectId}/channels`);

    await page.getByLabel("Channel type").selectOption("whatsapp");
    await page.getByLabel("External reference (optional)").fill("e2e-vendor-group");
    await page.getByRole("button", { name: "Attach channel" }).click();
    // Scoped to the attached row itself, not the still-visible "whatsapp"
    // option left selected in the attach form's own dropdown.
    const channelRow = page.locator("li", { hasText: "e2e-vendor-group" });
    await expect(channelRow).toBeVisible();
    await expect(channelRow.getByText("healthy")).toBeVisible();
    // A freshly attached channel starts healthy — no Reconnect affordance
    // renders for a channel that isn't degraded (app/api/channels.py's
    // attach_channel always sets healthy=True).
    await expect(channelRow.getByRole("button", { name: "Reconnect" })).toHaveCount(0);

    await channelRow.getByRole("button", { name: "Health history" }).click();
    await expect(channelRow.getByText(/No health checks recorded yet/)).toBeVisible();

    // There is no service-account/capture-agent identity yet to call
    // POST .../health as (this router's own header comment), so a real
    // degraded report is simulated the same out-of-band way
    // foresight.spec.ts's own race-condition test already established:
    // this session's real bearer token (`/api/auth/session`), a real API
    // call, never a mocked response.
    const session = (await (await page.request.get("/api/auth/session")).json()) as {
      accessToken: string;
    };
    const authHeaders = { Authorization: `Bearer ${session.accessToken}` };
    const channels = (await (
      await page.request.get(`${API_URL}/projects/${projectId}/channels`, { headers: authHeaders })
    ).json()) as { id: string; type: string }[];
    const channelId = channels.find((c) => c.type === "whatsapp")!.id;
    const degraded = await page.request.post(
      `${API_URL}/projects/${projectId}/channels/${channelId}/health`,
      { headers: authHeaders, data: { healthy: false } },
    );
    expect(degraded.status()).toBe(200);

    await page.reload();
    const reloadedRow = page.locator("li", { hasText: "e2e-vendor-group" });
    await expect(reloadedRow.getByText("degraded")).toBeVisible();
    await reloadedRow.getByRole("button", { name: "Reconnect" }).click();
    await expect(reloadedRow.getByText("healthy")).toBeVisible();
    await expect(reloadedRow.getByText("degraded")).toHaveCount(0);
  });

  test("a consent action-request round-trips to a real current status", async ({ page }) => {
    await login(page, seed.email);
    await page.goto(`/admin/projects/${projectId}/consent`);

    await page.getByLabel("Party").selectOption({ label: "Golden Sound & Light Pte Ltd" });
    await page.getByLabel("Status").selectOption("accepted");
    await page.getByLabel("Evidence (optional)").fill("Notice acknowledged via e2e run");
    await page.getByRole("button", { name: "Record" }).click();

    // Scoped to the current-status list, not the form's own now-selected
    // "Accepted" option in the Status dropdown.
    const consentList = page.getByRole("list");
    await expect(consentList.getByText("Accepted")).toBeVisible();

    // Reads back after a reload, not just the optimistic UI post-mutation.
    await page.reload();
    await expect(page.getByRole("list").getByText("Accepted")).toBeVisible();
  });

  test("a budget baseline creation then revision shows both in the resulting history", async ({
    page,
  }) => {
    // Finance-role, not the administrator this suite otherwise logs in as
    // — FR-ADM-11's baseline/revise write is Finance/Producer-gated
    // (app/api/budget.py), a real, different tier an administrator alone
    // does not hold. Granted in the provisioning test above.
    await login(page, financeEmail);
    await page.goto(`/admin/projects/${projectId}/budget`);
    await expect(page.getByText("No budget baseline recorded yet.")).toBeVisible();

    await page.getByLabel("Approved amount").fill("10000");
    await page.getByLabel("Currency").fill("SGD");
    await page.getByRole("button", { name: "Record baseline" }).click();
    await expect(page.getByText(/Current baseline:/)).toContainText("10,000");

    await page.getByLabel("Approved amount").fill("15000");
    await page.getByRole("button", { name: "Record revision" }).click();
    await expect(page.getByText(/Current baseline:/)).toContainText("15,000");

    // Both the original baseline and the revision that superseded it are
    // visible together — GET .../budget/history, this milestone's own
    // frontend-enablement addition (backend/PROGRESS.md's "round 7"); before
    // it, only the single current row was ever readable.
    await expect(page.getByText("baseline", { exact: true })).toBeVisible();
    await expect(page.getByText("current", { exact: true })).toBeVisible();
    const historyRows = page.locator("li", { hasText: /approved/ });
    await expect(historyRows).toHaveCount(2);
    await expect(historyRows.filter({ hasText: "10,000" })).toBeVisible();
    await expect(historyRows.filter({ hasText: "15,000" })).toBeVisible();
  });

  test("both export formats produce a real, non-empty downloadable file", async ({ page }) => {
    await login(page, seed.email);
    await page.goto(`/admin/projects/${projectId}/export`);

    const jsonDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download JSON" }).click();
    const jsonDownload = await jsonDownloadPromise;
    expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/);
    const jsonPath = await jsonDownload.path();
    expect(jsonPath && fs.statSync(jsonPath).size).toBeGreaterThan(0);

    const csvDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV (zip)" }).click();
    const csvDownload = await csvDownloadPromise;
    expect(csvDownload.suggestedFilename()).toMatch(/\.zip$/);
    const csvPath = await csvDownload.path();
    expect(csvPath && fs.statSync(csvPath).size).toBeGreaterThan(0);
  });

  test("a retention-policy override narrows behaviour, verified by reading it back after a reload", async ({
    page,
  }) => {
    await login(page, seed.email);
    await page.goto("/admin/retention");

    // A broader, organisation-wide default (no region) alongside a
    // narrower, region-scoped override — both must stay visible as
    // distinct rows, the org x vertical x region -> retention_days
    // resolution this milestone's own NON-OBVIOUS note names (NULL
    // broadens, same shape ThresholdConfigPanel already established).
    await page.getByLabel("Retention (days)").fill("400");
    await page.getByRole("button", { name: "Add policy" }).click();
    await expect(page.getByText("All verticals").first()).toBeVisible();

    await page.getByLabel("Region (blank = all regions)").fill("E2E-SG");
    await page.getByLabel("Retention (days)").fill("42");
    await page.getByRole("button", { name: "Add policy" }).click();
    await expect(page.getByText(/E2E-SG/)).toBeVisible();

    // Read back after a reload, not inferred from the optimistic UI alone
    // (same posture F3's own threshold-override e2e test already takes).
    await page.reload();
    await expect(page.getByText(/E2E-SG/)).toBeVisible();
    const narrowRow = page.locator("li", { hasText: "E2E-SG" });
    await expect(narrowRow.locator('input[type="number"]')).toHaveValue("42");
  });
});
