import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/auth";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.accessToken) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-linear-to-br from-signal to-dusk font-mono text-sm font-bold text-white">
          CQ
        </span>
        <span className="text-lg font-semibold tracking-tight text-ink">CUE</span>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="max-w-sm text-center text-xs text-ink-muted">
        Dev-only sign-in — calls the backend&rsquo;s <code>POST /auth/dev-login</code>. Run{" "}
        <code>uv run python3 scripts/seed_dev_data.py</code> from <code>backend/</code> for an
        organisation ID and role emails to use here.
      </p>
    </div>
  );
}
