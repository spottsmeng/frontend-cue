import Link from "next/link";

import { ProjectSwitcher, type ProjectSwitcherItem } from "./project-switcher";
import { UserMenu } from "./user-menu";

// Org-scoped surfaces (Admin console, Vendor Reliability Graph, Analytics)
// are deliberately NOT nested under /projects/[projectId] — their own
// backend endpoints (/admin/*, /parties, cross-project analytics) are
// org-scoped, not project-scoped (see require_org_administrator/
// require_org_finance in backend/app/api/deps.py), so their routes aren't
// either. Project-scoped surfaces (Living WIP, Twin, Foresight, Documents,
// Ask) live in the nested projects/[projectId]/layout.tsx instead.
const ORG_LINKS = [
  { href: "/admin", label: "Admin" },
  { href: "/vendors", label: "Vendors" },
  { href: "/analytics", label: "Analytics" },
];

export function TopNav({ projects }: { projects: ProjectSwitcherItem[] }) {
  return (
    <header className="flex h-14 flex-none items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-linear-to-br from-signal to-dusk font-mono text-xs font-bold text-white">
            CQ
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink">CUE</span>
        </Link>
        <ProjectSwitcher projects={projects} />
      </div>

      <nav className="flex items-center gap-1">
        {ORG_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-sunk hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <UserMenu />
    </header>
  );
}
