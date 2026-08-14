import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

const API_URL = process.env.NEXT_PUBLIC_CUE_API_URL ?? "http://localhost:8000";

// scripts/seed_dev_data.py mints every role's email as
// `{role}+{org_id.hex[:8]}@cue.dev` (vendors.spec.ts's/admin.spec.ts's own
// precedent for deriving this rather than hardcoding a guess).
const orgSuffix = seed.organisationId.replace(/-/g, "").slice(0, 8);
const pmEmail = `project_manager+${orgSuffix}@cue.dev`;

// The seed script's own LLMUsageEvent row (from run_embedding_sweep, see
// scripts/seed_dev_data.py) is recorded under whichever provider
// app/ask/embeddings.py's get_embedding_client() actually resolves —
// CUE_EMBED_PROVIDER, unset locally (defaults to real Ollama), but set to
// "fake" by this repo's own CI workflow (.github/workflows/*.yml) to avoid
// a real model dependency. A real, live bug this session found: this
// assertion was hardcoded to "ollama" and had never actually passed in CI
// — F8's own original push already failed here, undiscovered until now.
const seededProvider = process.env.CUE_EMBED_PROVIDER ?? "ollama";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Organisation ID").fill(seed.organisationId);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname !== "/login");
  await expect(page).not.toHaveURL(/\/login$/);
}

async function authHeaders(page: Page): Promise<{ Authorization: string }> {
  const session = (await (await page.request.get("/api/auth/session")).json()) as {
    accessToken: string;
  };
  return { Authorization: `Bearer ${session.accessToken}` };
}

/**
 * F8's own TESTING EXPECTATION, against the real backend seeded by
 * scripts/seed_dev_data.py (no mocks — frontend/CLAUDE.md's testing
 * philosophy). The dev seed already gives "CUE Dev Project" 7 real
 * commitments requiring human verification (verification_state !== "auto"
 * — 6 originally, plus F9's own second dedicated `pending_verification`
 * fixture, "Stage power distribution board," added for
 * `e2e/hardening.spec.ts`'s own keyboard-only flow)
 * and one real LLMUsageEvent row (from the seed script's own Ask-index
 * embedding call) — this spec first asserts those render as real numbers,
 * then seeds more real activity out-of-band (`page.request` with this
 * session's real bearer token, `e2e/admin.spec.ts`'s own established
 * pattern for a state no UI path reaches quickly) to prove every chart
 * moves when the underlying data changes, not just that it renders once.
 *
 * `describe.serial`: every test acts on the one project the shared seed
 * provisions, and the second test's out-of-band writes are asserted by the
 * first test's own later assertions after a reload — genuine ordering
 * dependency, same reasoning every other multi-test spec in this suite
 * already gives for `.serial`.
 */
test.describe.serial("Analytics dashboard (F8)", () => {
  test("verification burden, write-back reply rate and cost per project show real numbers that move when new data is seeded; every honestly-blocked metric names its own blocker", async ({
    page,
  }) => {
    await login(page, seed.email);
    const headers = await authHeaders(page);
    const projects = (await (
      await page.request.get(`${API_URL}/projects`, { headers })
    ).json()) as { id: string; name: string }[];
    // Not `projects[0]` — a real, live bug this session found: `GET
    // /projects` has no guaranteed order, and this suite runs alongside
    // other spec files that create real additional projects
    // (`e2e/admin.spec.ts`'s own "F7 E2E Project" provisioning test,
    // `e2e/hardening.spec.ts`'s own keyboard-only provisioning test) —
    // under `fullyParallel`, any of them can land before this file's own
    // `GET /projects` call and knock the seeded project out of index 0.
    // This test's own real assertions (6 non-auto commitments, one real
    // `LLMUsageEvent` row) only hold for the actual seeded project, by
    // name, not "whichever project happened to sort first."
    const seededProject = projects.find((p) => p.name === "CUE Dev Project");
    if (!seededProject) {
      throw new Error(
        `seeded "CUE Dev Project" not found among ${projects.length} projects — cannot proceed`,
      );
    }
    const projectId = seededProject.id;
    const projectName = seededProject.name;

    await page.goto("/analytics");
    await expect(
      page.getByText(/Pico can verify its own claimed value independently/),
    ).toBeVisible();

    // --- Verification burden: the seed's own 6 non-auto commitments ------
    const burdenPanel = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Verification burden" }) });
    await expect(burdenPanel.getByText(projectName)).toBeVisible();
    await expect(burdenPanel.getByRole("cell", { name: "7", exact: true })).toBeVisible();

    // --- Write-back reply rate: honestly empty before anything is sent ---
    const replyPanel = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Write-back reply rate" }) });
    await expect(
      replyPanel.getByText(/No write-back messages have been sent yet/),
    ).toBeVisible();

    // --- Cost per active project: the seed script's own real LLM call ----
    const costPanel = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Cost per active project" }) });
    await expect(costPanel.getByText(seededProvider)).toBeVisible();
    await expect(costPanel.getByText(projectName)).toBeVisible();

    // --- Not yet measurable: all seven honest blockers, never a blank ----
    const unmeasurablePanel = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Not yet measurable" }) });
    await expect(unmeasurablePanel.getByText(/Coordination overhead/)).toBeVisible();
    await expect(unmeasurablePanel.getByText(/Contingency drawn/)).toBeVisible();
    await expect(unmeasurablePanel.getByText(/Extraction accuracy by slice/)).toBeVisible();
    await expect(unmeasurablePanel.getByText(/Not yet measurable —/)).toHaveCount(7);

    // === Seed real, additional activity out-of-band, against the real ===
    // === backend — never a mocked response (F0's testing philosophy).  ===

    // 1. Verification burden should move: create a commitment (starts
    //    verification_state="auto" — a manual entry needs no verification,
    //    FR-LED-10), then verify it, transitioning it into the count.
    const commitments = (await (
      await page.request.get(`${API_URL}/projects/${projectId}/commitments`, { headers })
    ).json()) as {
      id: string;
      party_id: string;
      counterparty_id: string;
      verification_state: string;
    }[];
    const created = await page.request.post(
      `${API_URL}/projects/${projectId}/commitments`,
      {
        headers,
        data: {
          party_id: commitments[0].party_id,
          counterparty_id: commitments[0].counterparty_id,
          act_type: "commit",
          deliverable_en: "Analytics e2e seed commitment",
        },
      },
    );
    expect(created.ok()).toBe(true);
    const createdBody = (await created.json()) as { id: string };
    const verified = await page.request.post(
      `${API_URL}/projects/${projectId}/commitments/${createdBody.id}/verify`,
      { headers, data: {} },
    );
    expect(verified.ok()).toBe(true);

    // 2. Write-back reply rate should move: draft, authorise and send a
    //    real message for the one seeded pending-verification commitment
    //    (a real Ollama call — CLAUDE.md's own "dev/test = Ollama only"
    //    line; no Anthropic spend from this test).
    const pending = commitments.find((c) => c.verification_state === "pending_verification")!;
    const draft = await page.request.post(
      `${API_URL}/projects/${projectId}/writeback/draft`,
      { headers, data: { commitment_id: pending.id } },
    );
    expect(draft.ok()).toBe(true);
    const draftBody = (await draft.json()) as { id: string };
    const authorised = await page.request.post(
      `${API_URL}/projects/${projectId}/writeback/${draftBody.id}/authorise`,
      { headers },
    );
    expect(authorised.ok()).toBe(true);
    const sent = await page.request.post(
      `${API_URL}/projects/${projectId}/writeback/${draftBody.id}/send`,
      { headers },
    );
    expect(sent.ok()).toBe(true);

    await page.reload();

    // --- Verification burden moved from 7 to 8 ---------------------------
    await expect(burdenPanel.getByRole("cell", { name: "8", exact: true })).toBeVisible();

    // --- Reply rate now shows the one real sent, not-yet-replied message -
    const replyRow = replyPanel.locator("tbody tr").first();
    await expect(replyRow).toContainText(projectName);
    await expect(replyRow.getByRole("cell", { name: "1", exact: true }).first()).toBeVisible();
    await expect(replyRow.getByRole("cell", { name: "0%", exact: true })).toBeVisible();

    // --- Cost per project's call_count moved from 1 to 2 (the draft's own
    //     real LLM call) — scoped to the row body, not the totals footer,
    //     which legitimately shows the same "2" for a single-row summary. -
    await expect(
      costPanel.locator("tbody").getByRole("cell", { name: "2", exact: true }),
    ).toBeVisible();
    await expect(costPanel.getByText("US$0.00").first()).toBeVisible();
  });

  test("a non-administrator project member sees the trend charts but an explainable message on the administrator-only cost panel", async ({
    page,
  }) => {
    await login(page, pmEmail);
    await page.goto("/analytics");

    const costPanel = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Cost per active project" }) });
    await expect(costPanel.getByText(/administrator only/)).toBeVisible();
    await expect(costPanel.getByText(seededProvider)).toHaveCount(0);

    // Any project member — not just an administrator — can see the trend
    // panels, since GET .../commitments and GET .../writeback are gated on
    // plain project membership, a genuinely different tier than
    // GET /admin/cost-summary's require_org_administrator.
    const burdenPanel = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Verification burden" }) });
    await expect(burdenPanel.getByRole("cell", { name: "8", exact: true })).toBeVisible();
  });
});
