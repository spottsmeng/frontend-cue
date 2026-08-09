"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// One entry per F1–F8 project-scoped surface this session leaves as an
// empty placeholder route for. VRG here is deliberately absent — its own
// backend surface (/parties, /parties/{id}/reliability) is org-scoped, not
// project-scoped (Party isn't owned by one project — see
// backend/app/api/deps.py's require_org_finance docstring), so it lives at
// the top-level /vendors route (components/app-shell/top-nav.tsx) instead.
const SURFACES = [
  { segment: "", label: "Living WIP" },
  { segment: "twin", label: "Twin" },
  { segment: "foresight", label: "Foresight" },
  { segment: "documents", label: "Documents" },
  { segment: "ask", label: "Ask" },
];

export function ProjectSubnav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

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
