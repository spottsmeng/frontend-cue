import Link from "next/link";
import { redirect } from "next/navigation";

import { apiServer } from "@/lib/api/server";

export default async function HomePage() {
  const api = await apiServer();
  const { data: projects } = await api.GET("/projects");
  const list = projects ?? [];

  if (list.length === 1) {
    redirect(`/projects/${list[0].id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <h1 className="text-lg font-semibold text-ink">Your projects</h1>
      {list.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-6 text-sm text-ink-secondary">
          No project memberships yet. Ask an administrator to add you to a project, or — for local
          dev — run <code className="font-mono text-ink">uv run python3 scripts/seed_dev_data.py</code>{" "}
          from <code className="font-mono text-ink">backend/</code>.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex flex-col gap-0.5 rounded-lg border border-border bg-surface px-4 py-3 hover:border-signal"
              >
                <span className="text-sm font-medium text-ink">{project.name}</span>
                {project.client_name && (
                  <span className="text-xs text-ink-muted">{project.client_name}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
