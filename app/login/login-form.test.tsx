import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signIn, push, refresh, get } = vi.hoisted(() => ({
  signIn: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  get: vi.fn((): string | null => null),
}));
vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => ({ get }),
}));

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    signIn.mockReset();
    push.mockReset();
    refresh.mockReset();
    get.mockReturnValue(null);
  });

  it("submits the trimmed organisation ID and email to signIn", async () => {
    signIn.mockResolvedValue({ error: undefined });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/organisation id/i), "  org-123  ");
    await user.type(screen.getByLabelText(/email/i), "administrator@cue.dev");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(signIn).toHaveBeenCalledWith("cue-dev-login", {
      organisation_id: "org-123",
      email: "administrator@cue.dev",
      redirect: false,
    });
  });

  it("redirects to the callback URL on success", async () => {
    signIn.mockResolvedValue({ error: undefined });
    get.mockReturnValue("/projects/abc");
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/organisation id/i), "org-123");
    await user.type(screen.getByLabelText(/email/i), "administrator@cue.dev");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(push).toHaveBeenCalledWith("/projects/abc");
  });

  it("shows an error and does not navigate when signIn fails", async () => {
    signIn.mockResolvedValue({ error: "CredentialsSignin" });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/organisation id/i), "bad-org");
    await user.type(screen.getByLabelText(/email/i), "nobody@cue.dev");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/sign-in failed/i);
    expect(push).not.toHaveBeenCalled();
  });
});
