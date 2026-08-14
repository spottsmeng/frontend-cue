import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl as render } from "@/lib/test-utils";

import { UploadDocumentForm } from "./upload-document-form";

const { useUploadDocumentMutation, useDeliverableClassTermsQuery } = vi.hoisted(() => ({
  useUploadDocumentMutation: vi.fn(),
  useDeliverableClassTermsQuery: vi.fn(),
}));
vi.mock("@/lib/documents/hooks", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/documents/hooks")>();
  return { ...actual, useUploadDocumentMutation, useDeliverableClassTermsQuery };
});

function baseMutation() {
  return { mutate: vi.fn(), isPending: false, isError: false };
}

/**
 * F4's own TESTING EXPECTATION: "the multipart-upload form's validation."
 * `POST .../documents` is multipart/form-data, not JSON (this milestone's
 * own READ FIRST note) — what's under test here is that a real `File`
 * makes it into the mutation call unmangled, and that the form's `file`/
 * `name` guard (mirrors app/api/documents.py's own required fields) holds
 * before a mutation ever fires; the real multipart round-trip against the
 * backend is covered by e2e/documents.spec.ts instead.
 */
describe("UploadDocumentForm", () => {
  it("renders nothing for a role without write access", () => {
    useUploadDocumentMutation.mockReturnValue(baseMutation());
    useDeliverableClassTermsQuery.mockReturnValue({ data: [] });
    const { container } = render(
      <UploadDocumentForm projectId="p1" effectiveRoles={["read_only"]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("does not call the mutation when file or name is missing", async () => {
    const mutation = baseMutation();
    useUploadDocumentMutation.mockReturnValue(mutation);
    useDeliverableClassTermsQuery.mockReturnValue({ data: [] });
    const user = userEvent.setup();

    render(<UploadDocumentForm projectId="p1" effectiveRoles={["producer"]} />);
    await user.click(screen.getByRole("button", { name: "+ Upload document" }));

    // Name left blank — this form's own onSubmit guard (`if (!file ||
    // !name) return`) must hold regardless of the browser's own `required`
    // constraint, which fireEvent.submit bypasses entirely (see the next
    // test's own note on why native validation isn't relied on here).
    const file = new File(["%PDF-1.4 fixture"], "plan.pdf", { type: "application/pdf" });
    const fileInput = screen.getByLabelText("File", { exact: true }) as HTMLInputElement;
    await user.upload(fileInput, file);
    fireEvent.submit(fileInput.closest("form")!);

    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it("submits a real File plus the typed fields once file and name are both present", async () => {
    const mutation = baseMutation();
    useUploadDocumentMutation.mockReturnValue(mutation);
    useDeliverableClassTermsQuery.mockReturnValue({
      data: [{ id: "t-1", code: "led_screen", label_en: "LED screen", sort_order: 0 }],
    });
    const user = userEvent.setup();

    render(<UploadDocumentForm projectId="p1" effectiveRoles={["producer"]} />);
    await user.click(screen.getByRole("button", { name: "+ Upload document" }));

    const file = new File(["%PDF-1.4 fixture"], "plan.pdf", { type: "application/pdf" });
    const fileInput = screen.getByLabelText("File", { exact: true }) as HTMLInputElement;
    await user.upload(fileInput, file);
    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    await user.type(nameInput, "Booth floor plan");
    await user.selectOptions(screen.getByLabelText("Class"), "led_screen");

    // jsdom's own `checkValidity()` never recognises a `required` file
    // input as satisfied even after `userEvent.upload` sets real `.files`
    // (a known jsdom gap, not a real-browser one — e2e/documents.spec.ts's
    // own real-Chromium upload test already proves the real form submits
    // fine) — dispatching `submit` directly exercises this component's own
    // guard (`if (!file || !name) return`) without jsdom's native
    // constraint-validation gate standing in the way.
    fireEvent.submit(nameInput.closest("form")!);

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
    const [input] = mutation.mutate.mock.calls[0];
    expect(input.file).toBe(file);
    expect(input.name).toBe("Booth floor plan");
    expect(input.classCode).toBe("led_screen");
    expect(input.language).toBe("en");
  });
});
