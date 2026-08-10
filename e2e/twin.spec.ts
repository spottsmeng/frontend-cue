import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const seed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, ".seed.json"), "utf-8"),
) as { organisationId: string; email: string };

/**
 * F2's own TESTING EXPECTATION, against the real backend seeded by
 * scripts/seed_dev_data.py (no mocks — frontend/CLAUDE.md's testing
 * philosophy) — same seeded project e2e/living-wip.spec.ts runs against
 * (one shared `globalSetup` seed for the whole Playwright run), extended by
 * this milestone's own session with a real `event_start` and a parallel
 * fork/join branch (load-in -> "Backup generator delivery" -> content-load,
 * 5 days versus the original path's 1) specifically so critical-path/slack
 * rendering has something non-trivial to assert against — see
 * frontend/PROGRESS.md's F2 notes for the full reasoning.
 *
 * `describe.serial`: later tests build on earlier ones' UI state within the
 * same page navigation pattern (login helper), same reasoning
 * living-wip.spec.ts's own describe.serial gives; no test here deletes a
 * milestone or dependency, so nothing here corrupts the shared fixture for
 * a spec file running alongside it.
 */
test.describe.serial("Production Twin (F2)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Organisation ID").fill(seed.organisationId);
    await page.getByLabel("Email").fill(seed.email);
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
    await page.goto(page.url() + "/twin");
    await expect(page.getByText("Production Twin")).toBeVisible();
  });

  test("renders the timeline with critical-path and fixed-node styling from real seeded data", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();

    // The fixed "doors" milestone — locked, distinct from every other node.
    // The lock marker itself sits beside the row's button, not inside it
    // (timeline-node.tsx's own rail layout), so the containing <li> is the
    // right scope to check both the marker and the row's own "fixed" badge.
    const fixedListItem = page.locator("li", { hasText: "Exhibition opens" });
    await expect(fixedListItem.getByRole("button", { name: /Exhibition opens/ })).toBeVisible();
    await expect(fixedListItem.getByText("fixed")).toBeVisible();
    await expect(fixedListItem.getByTitle("Fixed — cannot be pushed by an upstream slip")).toBeVisible();

    // The seeded parallel branch: the generator-delivery detour is on the
    // critical path; the faster original leg (rigging) it bypasses is not.
    await expect(page.getByRole("button", { name: /Backup generator delivery/ })).toContainText(
      "critical path",
    );
    const riggingRow = page.getByRole("button", { name: /^Rigging/ });
    await expect(riggingRow).not.toContainText("critical path");
    await expect(riggingRow).toContainText("(critical)"); // zero slack, but not the graph's overall minimum

    await expect(page.getByText("Current binding constraint:")).toBeVisible();
  });

  test("editing a milestone's planned date recomputes downstream slack", async ({ page }) => {
    const downstreamRow = page.getByRole("button", { name: /^Booth design layout confirmation/ });
    const before = await downstreamRow.innerText();

    // "F&B confirmation" is the graph's one source node (no predecessors) —
    // per app/twin/graph.py's own forward-pass rule, a non-source node's
    // own planned_at is ignored once it has predecessors, so this is the
    // one milestone whose own date edit is guaranteed to ripple forward
    // through the whole chain rather than being absorbed with no visible
    // effect.
    await page.getByRole("button", { name: /^F&B confirmation/ }).click();
    const dialog = page.locator('[role="dialog"][aria-label="Milestone"]');
    await expect(dialog).toBeVisible();

    const plannedInput = dialog.getByLabel("Planned");
    const currentValue = await plannedInput.inputValue();
    const shifted = new Date(currentValue);
    shifted.setDate(shifted.getDate() - 5);
    const pad = (n: number) => String(n).padStart(2, "0");
    const newValue = `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}T${pad(shifted.getHours())}:${pad(shifted.getMinutes())}`;
    await plannedInput.fill(newValue);
    await dialog.getByRole("button", { name: "Save override" }).click();
    await expect(dialog.getByText("Saved — recorded in the Twin audit trail.")).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();

    await expect(downstreamRow).not.toHaveText(before);
  });

  test("attempting a cycle-creating dependency is rejected with an explainable message, not a generic error", async ({
    page,
  }) => {
    const depSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Dependencies" }) });
    await depSection.scrollIntoViewIfNeeded();

    const form = depSection.locator("form");
    await form.locator("select").nth(0).selectOption({ label: "Exhibition opens" });
    await form.locator("select").nth(1).selectOption({ label: "F&B confirmation" });
    await form.getByRole("button", { name: "Add dependency" }).click();

    await expect(form.getByText(/Rejected —/)).toBeVisible();
    await expect(form.getByText(/cycle/i)).toBeVisible();
  });

  test("deleting a milestone still referenced by a dependency is refused, naming the blocking edges", async ({
    page,
  }) => {
    // "Backup generator delivery" is this session's own seed fixture — it
    // has exactly two edges (load-in -> it -> content-load), so deleting it
    // must name both rather than a bare failed-request state.
    await page.getByRole("button", { name: /Backup generator delivery/ }).click();
    const dialog = page.locator('[role="dialog"][aria-label="Milestone"]');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText(/Remove 2 dependent edges first/)).toBeVisible();
    await expect(dialog.getByText(/Exhibits move in/)).toBeVisible();
    await expect(dialog.getByText(/Content load into screens/)).toBeVisible();
    // The plain delete affordance never renders while a milestone is
    // referenced — only the "remove edges first" list does.
    await expect(dialog.getByRole("button", { name: "Delete milestone" })).toHaveCount(0);

    await dialog.getByRole("button", { name: "Close" }).click();
  });

  test("running a propagation simulation changes nothing — re-fetching after confirms it", async ({
    page,
  }) => {
    const constraintBanner = page.getByText("Current binding constraint:").locator("..");
    const before = await constraintBanner.innerText();

    const simSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Propagation simulator" }) });
    await simSection.scrollIntoViewIfNeeded();
    await expect(simSection.getByText(/Simulation only/)).toBeVisible();

    await simSection.locator("select").first().selectOption({ label: "F&B confirmation" });
    await simSection.locator('input[type="datetime-local"]').first().fill("2026-12-25T09:00");
    await simSection.getByRole("button", { name: "Run simulation" }).click();

    await expect(simSection.getByText("Binding constraint after this shift:")).toBeVisible();
    await expect(simSection.getByText(/consumed .+ slack/).first()).toBeVisible();

    // Nothing persisted — a hard reload re-fetches /twin/current and
    // /twin/constraint from scratch; the real graph must be untouched.
    await page.reload();
    await expect(page.getByText("Production Twin")).toBeVisible();
    const after = await page.getByText("Current binding constraint:").locator("..").innerText();
    expect(after).toBe(before);
  });
});
