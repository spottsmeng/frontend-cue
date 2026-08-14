"use client";

import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

import { ContrastToggle } from "./contrast-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink-secondary hover:border-border-strong"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-dusk-soft font-mono text-xs font-semibold text-dusk">
          {session?.user?.email?.[0]?.toUpperCase() ?? "?"}
        </span>
        <span className="max-w-[12ch] truncate">{session?.user?.email ?? "Signed out"}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 flex w-56 flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-pop">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">{t("theme")}</span>
            <ThemeToggle />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">{t("language")}</span>
            <LocaleSwitcher />
          </div>
          <div className="flex flex-col gap-1.5">
            <ContrastToggle />
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md border border-border px-3 py-1.5 text-left text-sm text-ink-secondary hover:border-critical hover:text-critical"
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
