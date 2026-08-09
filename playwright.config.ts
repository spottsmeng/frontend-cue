import { defineConfig, devices } from "@playwright/test";

// Real backend only (this project's own testing philosophy, F0's own
// section: "no mocks of anything that matters... a Playwright spec that
// claims a feature works exercises the real backend, not a hand-rolled
// double") — e2e/global-setup.ts seeds it via backend/scripts/
// seed_dev_data.py, not a fixture server standing in for FastAPI.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Production build, not `next dev` — closer to what CI/deployment
    // actually runs, and avoids dev-mode's on-demand compile delay padding
    // out every first navigation in the suite.
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
