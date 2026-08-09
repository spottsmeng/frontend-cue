import { notFound } from "next/navigation";

import { apiServer } from "@/lib/api/server";
import { ProjectSubnav } from "@/components/app-shell/project-subnav";

export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const api = await apiServer();
  // A non-member gets 404 here (require_project_role's own documented
  // behaviour, backend/app/api/deps.py) — indistinguishable from a project
  // that doesn't exist at all, so this doesn't special-case 403 vs 404.
  const { data: project, response } = await api.GET("/projects/{project_id}", {
    params: { path: { project_id: projectId } },
  });
  if (response.status === 404 || !project) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-surface px-4 py-3">
        <h1 className="text-sm font-semibold text-ink">{project.name}</h1>
      </div>
      <ProjectSubnav projectId={projectId} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
