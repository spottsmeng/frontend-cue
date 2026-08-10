import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

// The one real, no-mocks spec F0 asks for: proves the whole chain (CORS,
// Auth.js -> POST /auth/dev-login, the generated API client, the app
// shell) actually works end to end. scripts/seed_dev_data.py seeds exactly
// one project per organisation, so "/" auto-redirects straight to it
// (app/(shell)/page.tsx's own `list.length === 1` check) rather than
// showing the multi-project picker — true for a fresh seed, but no longer
// the whole story once another spec file in the same Playwright invocation
// provisions a second real project against this shared org (F7's own
// e2e/admin.spec.ts does exactly this for FR-ADM-06's own real-provisioning
// test). Asserting only past `/login` and the seeded project's own real
// name being visible somewhere — a heading if auto-redirected, a picker
// entry otherwise — still proves the same chain works end to end without
// depending on which case fires, which `fullyParallel` execution order
// doesn't guarantee anyway.
test("dev-login lands on the seeded project", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Organisation ID").fill(seed.organisationId);
  await page.getByLabel("Email").fill(seed.email);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.getByText("CUE Dev Project")).toBeVisible();
});
