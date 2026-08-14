import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ProjectSwitcher, type ProjectSwitcherItem } from "./project-switcher";
import { UserMenu } from "./user-menu";

export async function TopNav({
  projects,
  canSeeVendors,
  canSeeAdmin,
}: {
  projects: ProjectSwitcherItem[];
  canSeeVendors: boolean;
  canSeeAdmin: boolean;
}) {
  const t = await getTranslations("nav");

  // Org-scoped surfaces (Admin console, Vendor Reliability Graph, Analytics)
  // are deliberately NOT nested under /projects/[projectId] — their own
  // backend endpoints (/admin/*, /parties, cross-project analytics) are
  // org-scoped, not project-scoped (see require_org_administrator/
  // require_org_finance in backend/app/api/deps.py), so their routes aren't
  // either. Project-scoped surfaces (Living WIP, Twin, Foresight, Documents,
  // Ask) live in the nested projects/[projectId]/layout.tsx instead.
  const ORG_LINKS = [
    { href: "/admin", label: t("admin") },
    { href: "/vendors", label: t("vendors") },
    { href: "/analytics", label: t("analytics") },
  ];

  // F6's own instruction: "hide the nav entry for other roles, but the real
  // gate is the backend's 403" (F0's UX-nicety-not-security-boundary
  // position) — /parties is require_org_finance-gated (FINANCE_ROLES,
  // app/api/deps.py) and /admin is require_org_administrator-gated
  // (ADMIN_ROLES = {"administrator"}), both computed in
  // app/(shell)/layout.tsx from the caller's own effective role on every
  // project in the org, not re-derived here. Analytics isn't gated the same
  // way yet — F8's own job.
  const links = ORG_LINKS.filter(
    (link) =>
      (link.href !== "/vendors" || canSeeVendors) && (link.href !== "/admin" || canSeeAdmin),
  );

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
        {links.map((link) => (
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
