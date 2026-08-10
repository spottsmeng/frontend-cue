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
  await page.goto(page.url() + "/documents");
  await expect(page.getByRole("heading", { name: "All documents" })).toBeVisible();
}

/**
 * F4's own TESTING EXPECTATION, against the real backend (MinIO included,
 * per backend/PROGRESS.md's M3 notes) and the real seed script
 * (scripts/seed_dev_data.py's own F4 enablement block — a cross-document
 * `contradicts` pair the arq worker's real sweep would otherwise need real
 * elapsed time to produce, same gap F3's own risk fixtures already work
 * around). `describe.serial`: later tests build on the document uploaded by
 * the first, same reasoning foresight.spec.ts/twin.spec.ts already give.
 */
test.describe.serial("Documents (F4)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, seed.email);
  });

  test("uploads a document (real multipart), it appears in the list, gains a new version, and approving marks the right one current", async ({
    page,
  }) => {
    const uniqueName = `Rigging plan ${Date.now()}`;
    const allDocsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "All documents" }) });

    await allDocsSection.getByRole("button", { name: "+ Upload document" }).click();
    await allDocsSection.getByLabel("File", { exact: true }).setInputFiles({
      name: "rigging-plan.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 rigging plan v1 fixture"),
    });
    await allDocsSection.getByLabel("Name").fill(uniqueName);
    await allDocsSection.getByLabel(/Extracted text/).fill("Rigging plan version one, truss load 500kg.");
    await allDocsSection.getByRole("button", { name: "Upload", exact: true }).click();

    await expect(allDocsSection.getByText(uniqueName)).toBeVisible();
    await allDocsSection.getByText(uniqueName).click();

    const versionsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Versions" }) });
    await expect(versionsSection.getByText("v1")).toBeVisible();
    await expect(versionsSection.getByText("Current", { exact: true })).toBeVisible();

    await versionsSection.getByRole("button", { name: "+ New version" }).click();
    await versionsSection.getByLabel("File", { exact: true }).setInputFiles({
      name: "rigging-plan-v2.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 rigging plan v2 fixture"),
    });
    await versionsSection.getByRole("button", { name: "Upload new version" }).click();

    await expect(versionsSection.getByText("v2")).toBeVisible();
    const v1Row = versionsSection.locator("li").filter({ hasText: "v1" });
    const v2Row = versionsSection.locator("li").filter({ hasText: "v2" });
    // FR-DOC-02: the new version supersedes the old one — current_version_id
    // repoints in the same transaction, never inferred client-side.
    await expect(v1Row.getByText("Superseded")).toBeVisible();
    await expect(v2Row.getByText("Current", { exact: true })).toBeVisible();

    await expect(v2Row.getByText("Not yet approved.")).toBeVisible();
    await v2Row.getByRole("button", { name: /^Approve/ }).click();
    // FR-DOC-02's "on whose approval" + the write-back framing (this
    // milestone's own NON-OBVIOUS note): approving reads as unconditionally
    // final, never gated on the (unsurfaced) SharePoint sync outcome.
    await expect(v2Row.getByText(/Approved by/)).toBeVisible();
    await expect(v2Row.getByText(/synced to SharePoint/)).toHaveCount(0);
  });

  test("search returns a real match against uploaded extracted_text", async ({ page }) => {
    const searchSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Search" }) });
    await searchSection.getByPlaceholder(/Search extracted document text/).fill("LED wall panel");
    await expect(searchSection.getByText("LED wall quotation.pdf")).toBeVisible();
  });

  test("tagging round-trips through a real ontology-term pick, not a pasted code", async ({ page }) => {
    await page.getByText("LED wall quotation.pdf").click();
    const tagsSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Tags" }) });

    const classSelect = tagsSection.getByLabel("Class");
    const firstRealOption = classSelect.locator("option").nth(1);
    const chosenCode = await firstRealOption.getAttribute("value");
    await classSelect.selectOption(chosenCode!);
    await tagsSection.getByRole("button", { name: "Save tags" }).click();
    await expect(tagsSection.getByText("Could not save tags.")).toHaveCount(0);

    // Verify by reading it back after a reload — GET .../documents/{id}
    // returns the persisted class_term_id, resolved back to this same code
    // via GET .../ontology-terms?category=deliverable_class (this form's
    // own codeForTermId), not inferred from the optimistic UI state alone.
    await page.reload();
    const reloadedTagsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Tags" }) });
    await expect(reloadedTagsSection.getByLabel("Class")).toHaveValue(chosenCode!);
  });

  test("renders a real cross-document spec-claim contradiction as a link, not an opaque UUID", async ({
    page,
  }) => {
    await page.getByText("LED wall shop drawing.pdf").click();
    const versionsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Versions" }) });
    await versionsSection.getByRole("button", { name: "View spec claims" }).click();

    await expect(versionsSection.getByText(/Conflicts with dimension/)).toBeVisible();
    const conflictLink = versionsSection.getByRole("link", { name: /LED wall quotation\.pdf/ });
    await expect(conflictLink).toBeVisible();
    await expect(versionsSection.getByText(/^[0-9a-f]{8}-[0-9a-f]{4}-/)).toHaveCount(0);

    await conflictLink.click();
    await expect(page.getByText("LED wall quotation.pdf").first()).toBeVisible();
  });
});
