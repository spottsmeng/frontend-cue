import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { apiServer } from "@/lib/api/server";
import { TopNav } from "@/components/app-shell/top-nav";

// Mirrors lib/roles.ts's own FINANCE_ROLES exactly (app/identity/
// service.py's FINANCE_ROLES = {"finance", "producer"}) — not imported from
// there, deliberately: that file also exports client-hook-housing code
// (useEffectiveRoles, built on lib/api/browser.ts's "use client"
// useApiClient), and this is the one Server Component in this app that
// needs just the plain constant, not the hook. Same "second, independent
// copy, never itself a security boundary" posture lib/roles.ts's own
// comment already states — the server independently re-derives and
// enforces require_org_finance on every actual request regardless of what
// this constant says.
const FINANCE_ROLES = ["finance", "producer"];

// Same posture, applied to /admin: require_org_administrator's own role set
// ({"administrator"}, app/api/deps.py) — a second, independent copy, never
// itself a security boundary (every /admin/* read/write independently
// re-derives and enforces this server-side).
const ADMIN_ROLES = ["administrator"];

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // proxy.ts already redirects unauthenticated requests optimistically
  // (reading the session cookie only, per Next's own guidance not to do a
  // real check there) — this is the real, request-time check, since a
  // layout wrapping every project-scoped surface is exactly the "close to
  // the data source" place PRD §11.1's "no client-side entitlement logic"
  // asks for.
  if (!session?.accessToken) {
    redirect("/login");
  }

  const api = await apiServer();
  // Already RLS + membership filtered server-side (FR-ADM-02) — rendered
  // as-is, no client-side re-filtering per this list's own docstring.
  const { data: projects } = await api.GET("/projects");

  // F6's own "hide the nav entry for other roles" instruction — /parties is
  // require_org_finance-gated (FINANCE_ROLES = {finance, producer} on *any*
  // project in the org, app/api/deps.py), a genuinely org-wide question no
  // single project's own /members/me can answer alone. There is no org-wide
  // "my roles" endpoint (this milestone's own gap-audit check: closing one
  // would mean a new backend surface for a UX nicety F0's own docstring
  // already says isn't a security boundary — not worth it at the project
  // counts this app runs at, CUE-Tech-Stack.md §4's own "don't distribute
  // early" scale reasoning applied here to request fan-out instead), so
  // this fans out to the same per-project GET /projects/{id}/members/me F1
  // already added, one call per project this user can already see, and
  // checks whether any of them grant a finance/producer role.
  const roleChecks = await Promise.all(
    (projects ?? []).map((p) => api.GET("/projects/{project_id}/members/me", {
      params: { path: { project_id: p.id } },
    })),
  );
  const canSeeVendors = roleChecks.some(({ data }) =>
    (data?.roles ?? []).some((r) => FINANCE_ROLES.includes(r)),
  );
  const canSeeAdmin = roleChecks.some(({ data }) =>
    (data?.roles ?? []).some((r) => ADMIN_ROLES.includes(r)),
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopNav
        projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name }))}
        canSeeVendors={canSeeVendors}
        canSeeAdmin={canSeeAdmin}
      />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
