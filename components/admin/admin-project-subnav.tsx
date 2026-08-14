"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

// Per-project admin screens (WHAT TO BUILD #3–#6, #8–#9, #11's project-
// scoped half) — several distinct screens under one shell, not one
// monolithic page (Prompt F7's own top-of-file instruction). Root segment
// ("") is Members & Delegations, same "root = the first/primary screen"
// convention components/app-shell/project-subnav.tsx already uses for
// Living WIP.
const SURFACES = [
  { segment: "", key: "members" },
  { segment: "channels", key: "channels" },
  { segment: "consent", key: "consent" },
  { segment: "budget", key: "budget" },
  { segment: "settings", key: "settings" },
  { segment: "export", key: "export" },
] as const;

export function AdminProjectSubnav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const t = useTranslations("admin.subnav.project");
  const base = `/admin/projects/${projectId}`;

  return (
    <nav className="flex items-center gap-1 border-b border-border bg-surface px-4">
      {SURFACES.map(({ segment, key }) => {
        const href = segment ? `${base}/${segment}` : base;
        const active = pathname === href;
        return (
          <Link
            key={key}
            href={href}
            className={`border-b-2 px-3 py-2.5 text-sm ${
              active
                ? "border-signal font-medium text-ink"
                : "border-transparent text-ink-secondary hover:text-ink"
            }`}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
