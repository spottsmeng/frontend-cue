"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Global (org-wide, no project picked yet) admin screens — WHAT TO BUILD
// #1's "genuinely global screens (org users, org-wide delegations, export)
// that don't need [a project]", plus retention and channel-identity
// overrides (also org-wide per their own backend gates). Per-project
// screens live under their own AdminProjectSubnav once a project is picked.
const SURFACES = [
  { segment: "", label: "Overview" },
  { segment: "users", label: "Users" },
  { segment: "delegations", label: "Delegations" },
  { segment: "retention", label: "Retention" },
  { segment: "channel-identities", label: "Channel identities" },
];

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-border bg-surface px-4">
      {SURFACES.map(({ segment, label }) => {
        const href = segment ? `/admin/${segment}` : "/admin";
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
