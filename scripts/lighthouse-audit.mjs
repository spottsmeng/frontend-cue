// F9's real, recorded Lighthouse run (TESTING EXPECTATION: "an actual
// Lighthouse accessibility score"). A standalone one-off script, not a
// permanent Playwright spec — playwright-lighthouse needs a fixed
// `--remote-debugging-port`, which fights this project's own parallel
// Playwright test workers (each launching its own browser); running it here
// keeps that friction out of the regular `pnpm test:e2e` suite, the same
// "real but occasional, not CI-gated" posture backend/PROGRESS.md's own
// `loadtest/` (k6) already established for a different NFR.
//
// A persistent context, not a plain `browser.newPage()` — playwright-
// lighthouse's own README ("Running lighthouse on authenticated routes"):
// Lighthouse opens its own fresh page internally to gather each audit, and
// a plain (non-persistent) browser context shares no storage with it, so
// every "authenticated" audit silently redirected to /login instead of
// measuring the real page (caught by checking `lhr.finalDisplayedUrl`
// directly — it read `/login?callbackUrl=...`, not the intended page — not
// assumed from the score alone, since a re-audited /login coincidentally
// also scores accessibility=100 after this session's own fix below, which
// would have hidden the mismatch).
import { chromium } from "@playwright/test";
import { playAudit } from "playwright-lighthouse";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../e2e/.seed.json"), "utf-8"));
const PORT = 9223;

async function login(page) {
  await page.goto("http://localhost:3000/login");
  await page.getByLabel("Organisation ID").fill(seed.organisationId);
  await page.getByLabel("Email").fill(seed.email);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle");
  if (page.url().endsWith("/")) {
    await page.getByRole("link", { name: "CUE Dev Project" }).click();
  }
}

const THRESHOLDS = { performance: 0, accessibility: 0, "best-practices": 0, seo: 0 };

async function main() {
  const userDataDir = path.join(os.tmpdir(), "cue-lighthouse-" + Date.now());
  const context = await chromium.launchPersistentContext(userDataDir, {
    args: [`--remote-debugging-port=${PORT}`],
  });
  const page = await context.newPage();

  const results = {};

  // Unauthenticated
  await page.goto("http://localhost:3000/login");
  results["/login"] = await playAudit({
    page,
    port: PORT,
    thresholds: THRESHOLDS,
    reports: { formats: { json: false }, name: `lighthouse-login` },
  });

  await login(page);
  const projectUrl = page.url();

  const authedPages = {
    "living-wip": projectUrl,
    twin: `${projectUrl}/twin`,
    admin: "http://localhost:3000/admin",
  };

  for (const [name, url] of Object.entries(authedPages)) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    results[name] = await playAudit({
      page,
      port: PORT,
      thresholds: THRESHOLDS,
      reports: { formats: { json: false }, name: `lighthouse-${name}` },
    });
    const finalUrl = results[name].lhr.finalDisplayedUrl;
    if (!finalUrl.startsWith(url.split("?")[0])) {
      console.warn(`WARNING: ${name} audited ${finalUrl}, not the intended ${url} — result is unreliable.`);
    }
  }

  await context.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });

  console.log("\n=== F9 Lighthouse summary ===");
  for (const [name, result] of Object.entries(results)) {
    const categories = result.lhr.categories;
    console.log(
      `${name}: accessibility=${Math.round(categories.accessibility.score * 100)} ` +
        `performance=${Math.round(categories.performance.score * 100)} ` +
        `best-practices=${Math.round(categories["best-practices"].score * 100)} ` +
        `seo=${Math.round(categories.seo.score * 100)} ` +
        `(audited: ${result.lhr.finalDisplayedUrl})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
