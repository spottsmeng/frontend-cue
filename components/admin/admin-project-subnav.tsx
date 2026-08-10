"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Per-project admin screens (WHAT TO BUILD #3–#6, #8–#9, #11's project-
// scoped half) — several distinct screens under one shell, not one
// monolithic page (Prompt F7's own top-of-file instruction). Root segment
// ("") is Members & Delegations, same "root = the first/primary screen"
// convention components/app-shell/project-subnav.tsx already uses for
// Living WIP.
const SURFACES = [
  { segment: "", label: "Members & Delegations" },
  { segment: "channels", label: "Channels" },
  { segment: "consent", label: "Consent" },
  { segment: "budget", label: "Budget" },
  { segment: "settings", label: "Settings" },
  { segment: "export", label: "Export" },
];

export function AdminProjectSubnav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/admin/projects/${projectId}`;

  return (
    <nav className="flex items-center gap-1 border-b border-border bg-surface px-4">
      {SURFACES.map(({ segment, label }) => {
        const href = segment ? `${base}/${segment}` : base;
        const active = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            className={`border-b-2 px-3 py-2.5 text-sm ${
              active
                ? "border-signal font-medium text-ink"
                : "border-transparent text-ink-secondary hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
