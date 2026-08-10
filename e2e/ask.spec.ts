import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Organisation ID").fill(seed.organisationId);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  await page.goto(page.url() + "/ask");
  await expect(page.getByLabel("Ask a question")).toBeVisible();
}

/**
 * F5's own TESTING EXPECTATION, against the real backend, real Postgres,
 * real UI — but a fake LLM/embedding client (CUE_LLM_*_PROVIDER=fake,
 * CUE_EMBED_PROVIDER=fake, this repo's own ci.yml). Real Ollama models are
 * scoped to the developer's own local machine only — dev, test, demo,
 * switching to a frontier model for production once the app is solid
 * (CLAUDE.md's Models table, and this project's own stated dev-cost
 * strategy) — a remote CI runner was never one of those places, and
 * (measured directly) is also just too slow for a fast per-push gate:
 * ~20s for a real answer on real GPU-accelerated local hardware still
 * hadn't returned after 220s twice on CI's own CPU-only, no-GPU, 2-vCPU
 * runner. `FakeClient`/`FakeEmbeddingClient` (backend's app/llm/client.py,
 * app/ask/embeddings.py) exist specifically so this spec still tests real
 * wiring — does the UI render citations, does it render each
 * `refusal_kind` distinctly, does `conversation_id` thread through — fast
 * and deterministically, without asserting anything about real model
 * *quality* (that's backend/.github/workflows/cue-eval.yml's own job, a
 * separate, non-blocking workflow, never this gate).
 *
 * `describe.serial`: chat/follow-up tests build a running conversation on
 * one page instance, same reasoning every other e2e spec's serial block
 * already gives.
 */
test.describe.serial("Ask (F5)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, seed.email);
  });

  test("a document-grounded question gets a real cited answer, and the citation opens the real document", async ({
    page,
  }) => {
    await page.getByLabel("Ask a question").fill("What size is the LED wall panel at location H?");
    await page.locator("form").getByRole("button", { name: "Ask" }).click();

    // FR-ASK-02: an available answer always carries at least one citation
    // (Pydantic-enforced on the backend, app/ask/schema.py) — this is the
    // UI's own confirmation of that invariant, not a re-check of it.
    // Anchored to "Document (v" specifically — a bare /Document/ regex also
    // matches the always-present "Documents" nav link in the project
    // subnav, which resolves instantly and defeats the wait for a real
    // answer (caught by watching this test actually fail against the real
    // backend, not assumed).
    const citation = page.getByRole("link", { name: /^Document \(v\d+\)/ }).first();
    await expect(citation).toBeVisible();

    await citation.click();
    // Lands on F4's own document detail page, resolved from only the
    // DocumentVersion id on the wire via this milestone's own
    // GET .../documents/versions/{version_id} addition.
    await expect(page).toHaveURL(/\/documents\/[^/]+$/);
    await expect(page.getByText(/LED wall (quotation|shop drawing)\.pdf/)).toBeVisible();
    await page.goBack();
    await expect(page.getByLabel("Ask a question")).toBeVisible();
  });

  test("a question with no supporting evidence returns the honest no_citable_source refusal, not a fabricated answer", async ({
    page,
  }) => {
    await page.getByLabel("Ask a question").fill("What is the capital of France?");
    await page.locator("form").getByRole("button", { name: "Ask" }).click();

    await expect(page.getByText("I don’t have evidence for that")).toBeVisible();
    await expect(page.getByText("CUE can’t do that yet")).toHaveCount(0);
  });

  test("an action-shaped question returns action_not_yet_supported, distinct from the no-evidence refusal, with a real way to do it directly", async ({
    page,
  }) => {
    await page.getByLabel("Ask a question").fill("Please chase the vendor for an update on the LED wall rental.");
    await page.locator("form").getByRole("button", { name: "Ask" }).click();

    await expect(page.getByText("CUE can’t do that yet")).toBeVisible();
    await expect(page.getByText("I don’t have evidence for that")).toHaveCount(0);
    const link = page.getByRole("link", { name: /Open the commitment in Living WIP/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /\/projects\/[^/]+$/);
  });

  test("a follow-up question reuses the same conversation_id the first answer minted, not a fresh one", async ({
    page,
  }) => {
    const firstResponse = page.waitForResponse((r) => r.url().includes("/ask/query") && r.status() === 200);
    await page.getByLabel("Ask a question").fill("What is the LED wall rental commitment about?");
    await page.locator("form").getByRole("button", { name: "Ask" }).click();
    const first = await firstResponse;
    const firstBody = await first.json();
    expect(firstBody.conversation_id).toBeTruthy();

    await expect(
      page.getByText("Follow-up questions use this conversation's own context."),
    ).toBeVisible();

    const secondRequest = page.waitForRequest((r) => r.url().includes("/ask/query") && r.method() === "POST");
    await page.getByLabel("Ask a question").fill("And what's the amount?");
    await page.locator("form").getByRole("button", { name: "Ask" }).click();
    const second = await secondRequest;
    const secondBody = second.postDataJSON() as { conversation_id: string | null };

    expect(secondBody.conversation_id).toBe(firstBody.conversation_id);

    // "New conversation" actually drops it — the next call omits conversation_id.
    await expect(page.getByRole("button", { name: "New conversation" })).toBeVisible();
    await page.getByRole("button", { name: "New conversation" }).click();
    const thirdRequest = page.waitForRequest((r) => r.url().includes("/ask/query") && r.method() === "POST");
    await page.getByLabel("Ask a question").fill("What is outstanding on this project?");
    await page.locator("form").getByRole("button", { name: "Ask" }).click();
    const third = await thirdRequest;
    expect((third.postDataJSON() as { conversation_id: string | null }).conversation_id).toBeNull();
  });

  test("each of the five summary variants renders its own typed shape against real seeded data", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Summaries" }).click();

    // project_status (default tab) — "Open commitments" is this variant's
    // own field label, unambiguous unlike "CUE Dev Project" (also rendered
    // by the top-nav project switcher and the project layout's own <h1>).
    await expect(page.getByText("Open commitments")).toBeVisible();
    await expect(page.getByText("Next milestone", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Vendor status" }).click();
    await expect(page.getByText("Golden Sound & Light Pte Ltd")).toBeVisible();

    await page.getByRole("button", { name: "Period digest" }).click();
    await page.getByRole("button", { name: "Generate digest" }).click();
    await expect(page.getByText("Commitments created")).toBeVisible();
    await expect(page.getByText("Commitments resolved")).toBeVisible();

    await page.getByRole("button", { name: "Decision history" }).click();
    // Either a real decision row or the honest empty state — never a blank
    // panel or a thrown error either way.
    await expect(
      page.getByText(/No decisions recorded on this project yet\.|verify|correct/i).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Outstanding actions" }).click();
    await expect(page.getByText("By owner")).toBeVisible();
    await expect(page.getByText("By due window")).toBeVisible();
    await expect(page.getByText("Golden Sound & Light Pte Ltd")).toBeVisible();
  });

  test("generates a full Successor Brief covering every named section with real seeded data", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Successor brief" }).click();
    await page.getByRole("button", { name: "Generate successor brief" }).click();

    await expect(page.getByText(/Generated /)).toBeVisible();

    const briefRoot = page.locator("div").filter({ hasText: "Open commitments" }).first();
    await expect(briefRoot.getByText("Stage rigging safety certification")).toBeVisible();
    await expect(briefRoot.getByText("Golden Sound & Light Pte Ltd")).toBeVisible();
    await expect(briefRoot.getByRole("link", { name: "LED wall quotation.pdf" })).toBeVisible();
    await expect(briefRoot.getByRole("link", { name: "LED wall shop drawing.pdf" })).toBeVisible();
    // risk_forecast — never acted on by any other e2e spec, so its presence
    // here is deterministic regardless of parallel-worker ordering.
    await expect(briefRoot.getByText(/Content load into screens has fallen/)).toBeVisible();

    // FR-DEV-05 note this milestone's own prompt makes explicit: every
    // deviation, resolved or not — never filtered down to open-only.
    await expect(briefRoot.getByText(/Vendor's quoted LED wall spec drifted/)).toBeVisible();
    await expect(briefRoot.getByText(/Rigging crew call time slipped two hours/)).toBeVisible();
    // Never a raw resolution_owner UUID, even if another spec already
    // resolved this deviation (lib/members/hooks.ts's resolveMemberLabel).
    await expect(briefRoot.getByText(/^[0-9a-f]{8}-[0-9a-f]{4}-/)).toHaveCount(0);
  });
});
