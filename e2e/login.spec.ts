import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

// The one real, no-mocks spec F0 asks for: proves the whole chain (CORS,
// Auth.js -> POST /auth/dev-login, the generated API client, the app
// shell) actually works end to end. seed_dev_data.py seeds exactly one
// project per organisation, so "/" auto-redirects straight to it rather
// than showing the multi-project picker — landing on the project and
// seeing its real name is the same proof of the chain working; F1 is
// where that project's content becomes worth testing further.
test("dev-login lands on the seeded project", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Organisation ID").fill(seed.organisationId);
  await page.getByLabel("Email").fill(seed.email);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "CUE Dev Project" })).toBeVisible();
});
