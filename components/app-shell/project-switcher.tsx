"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useUIStore } from "@/lib/store/ui-store";

export interface ProjectSwitcherItem {
  id: string;
  name: string;
}

// Derives the active project from the URL itself (`/projects/:id/...`)
// rather than a prop threaded down from the root shell layout — that
// layout wraps both `/` and every `/projects/[projectId]/...` route, and
// Next.js only hands a segment's own `params` to layouts at or below it in
// the tree, so reading the pathname here is simpler than plumbing the
// dynamic segment back up.
function projectIdFromPathname(pathname: string): string | undefined {
  return pathname.match(/^\/projects\/([^/]+)/)?.[1];
}

export function ProjectSwitcher({ projects }: { projects: ProjectSwitcherItem[] }) {
  const open = useUIStore((s) => s.projectSwitcherOpen);
  const setOpen = useUIStore((s) => s.setProjectSwitcherOpen);
  const currentProjectId = projectIdFromPathname(usePathname());
  const current = projects.find((p) => p.id === currentProjectId);
  const t = useTranslations("nav");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink hover:border-border-strong"
      >
        <span className="max-w-[24ch] truncate font-medium">
          {current?.name ?? t("selectAProject")}
        </span>
        <span aria-hidden className="text-ink-muted">
          ⌄
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 z-20 mt-2 max-h-80 w-72 overflow-y-auto rounded-lg border border-border bg-surface p-1.5 shadow-pop"
        >
          {projects.length === 0 && (
            <li className="px-3 py-2 text-sm text-ink-muted">{t("noProjectsYet")}</li>
          )}
          {projects.map((project) => (
            <li key={project.id} role="option" aria-selected={project.id === currentProjectId}>
              <Link
                href={`/projects/${project.id}`}
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm hover:bg-surface-sunk ${
                  project.id === currentProjectId ? "text-signal font-medium" : "text-ink"
                }`}
              >
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
