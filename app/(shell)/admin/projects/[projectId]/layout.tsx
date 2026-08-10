import { notFound } from "next/navigation";
import Link from "next/link";

import { apiServer } from "@/lib/api/server";
import { AdminProjectSubnav } from "@/components/admin/admin-project-subnav";

/**
 * `GET /projects/{project_id}` (`Depends(get_project)`, no role
 * requirement) rather than `/admin/export/{id}` or similar
 * `require_org_administrator`-only read — this layout only needs the
 * project's own name for the header, and reusing the plain membership-tier
 * read here means this shell 404s a caller with no relationship to the
 * project at all (mirroring `app/(shell)/projects/[projectId]/layout.tsx`'s
 * own shape) while every actual admin action underneath still independently
 * enforces `require_org_administrator` server-side regardless of what this
 * layout does.
 */
export default async function AdminProjectLayout({
  children,
  params,
}: LayoutProps<"/admin/projects/[projectId]">) {
  const { projectId } = await params;
  const api = await apiServer();
  const { data: project, response } = await api.GET("/projects/{project_id}", {
    params: { path: { project_id: projectId } },
  });
  if (response.status === 404 || !project) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{project.name}</h2>
        <Link href="/admin" className="text-sm text-ink-muted hover:text-signal">
          ← All projects
        </Link>
      </div>
      <AdminProjectSubnav projectId={projectId} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
