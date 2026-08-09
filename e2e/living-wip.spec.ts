import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

// F1's own TESTING EXPECTATION, against the real backend seeded by
// scripts/seed_dev_data.py (no mocks — this project's testing philosophy,
// F0's own section) — one describe.serial block, not independent parallel
// tests, since every scenario here acts on the same seeded project's
// "LED wall rental — main stage" commitment and the second test depends on
// state the first one only reads, not vice versa; running them out of
// order or interleaved would make either flaky for reasons that have
// nothing to do with a real bug.
test.describe.serial("Living WIP (F1)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Organisation ID").fill(seed.organisationId);
    await page.getByLabel("Email").fill(seed.email);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  });

  test("renders all seven sections with the real seeded ledger", async ({ page }) => {
    for (const heading of [
      "Project overview",
      "Milestone tracker",
      "Vendor status",
      "Budget summary",
      "Risk and issues",
      "Decision and approval log",
      "Next steps",
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    // The seeded pending-verification monetary commitment, surfaced with
    // its verification pill — proves the report composed real ledger data,
    // not an empty-state shell.
    await expect(page.getByText("LED wall rental — main stage").first()).toBeVisible();
    await expect(page.getByText("Pending verification").first()).toBeVisible();
  });

  test("blocks export while unverified, verifies the commitment, then exports; write-back drafts, authorises and sends", async ({
    page,
  }) => {
    test.setTimeout(150_000); // the write-back draft composes via a real local LLM call

    // --- FR-RPT-06: export blocked with the real 409 shape ---------------
    await page.getByRole("button", { name: "PDF" }).click();
    await expect(page.getByText(/export blocked/i)).toBeVisible();
    const blockedLink = page.getByRole("button", { name: "LED wall rental — main stage →" });
    await expect(blockedLink).toBeVisible();

    // --- FR-LED-08: three-tap verify, straight from the blocking link ----
    await blockedLink.click();
    const dialog = page.locator('[role="dialog"][aria-label="Commitment"]');
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(dialog.getByText("Verified", { exact: true })).toBeVisible();

    // --- the report figure actually updates, not just the drawer ---------
    const budgetSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Budget summary" }) });
    await expect(budgetSection.getByText("Pending verification")).toHaveCount(0);
    await expect(budgetSection.getByText("Verified", { exact: true }).first()).toBeVisible();

    // --- FR-WBK-01/02/03: draft (composes a real closed question) --------
    await dialog.getByRole("button", { name: "Confirm with vendor" }).click();
    await expect(dialog.getByText("Draft — not yet sent")).toBeVisible({ timeout: 120_000 });
    const draftTextbox = dialog.getByLabel("Draft message");
    await expect(draftTextbox).not.toHaveValue("");

    // --- FR-WBK-05: authorise and send are separate, explicit steps ------
    await dialog.getByRole("button", { name: "Authorise" }).click();
    await expect(dialog.getByText("Authorised — not yet sent")).toBeVisible();
    await dialog.getByRole("button", { name: "Send" }).click();
    await expect(dialog.getByText("Prior outbound messages")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).first().click();

    // --- FR-RPT-08: export now succeeds and snapshots immutably ----------
    await page.getByRole("button", { name: "PDF" }).click();
    await expect(page.getByText(/export ready/i)).toBeVisible({ timeout: 30_000 });
    // Two "Download →" links now legitimately exist — the export popover's
    // own, and the Export history section's row for the same new snapshot
    // (FR-RPT-08: every export is independently retrievable there too) —
    // `.first()` is the popover.
    await expect(page.getByRole("link", { name: /download/i }).first()).toHaveAttribute("href", /.+/);
  });
});
