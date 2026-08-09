"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [organisationId, setOrganisationId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signIn("cue-dev-login", {
        organisation_id: organisationId.trim(),
        email: email.trim(),
        redirect: false,
      });
      if (result?.error) {
        setError("Sign-in failed — check the organisation ID and try again.");
        return;
      }
      router.push(searchParams.get("callbackUrl") ?? "/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="organisation_id" className="text-sm font-medium text-ink-secondary">
          Organisation ID
        </label>
        <input
          id="organisation_id"
          name="organisation_id"
          type="text"
          required
          autoComplete="off"
          placeholder="paste the UUID scripts/seed_dev_data.py printed"
          value={organisationId}
          onChange={(e) => setOrganisationId(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-ink-secondary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="administrator@cue.dev"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-critical-soft px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-signal px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
