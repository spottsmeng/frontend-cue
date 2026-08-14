"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { AdminPermissionError } from "@/lib/admin/members-hooks";
import { useAdminProjectsQuery } from "@/lib/admin/projects-hooks";
import { formatDate } from "@/lib/format";

import { SectionPanel } from "../living-wip/section-panel";
import { ProjectProvisioningForm } from "./project-provisioning-form";

/**
 * WHAT TO BUILD #1: the project picker feeding into per-project admin
 * screens, plus this milestone's own provisioning flow. `GET /admin/projects`
 * (this milestone's own frontend-enablement addition — backend/PROGRESS.md's
 * "round 7") is genuinely org-wide, not FR-ADM-02's membership-filtered
 * `GET /projects` — an Administrator picking a project to manage here should
 * see every project in the organisation, the same completeness
 * `require_org_administrator`'s own docstring promises for every other
 * `/admin/*` read.
 */
export function AdminOverviewView() {
  const { data: projects, isLoading, isError, error } = useAdminProjectsQuery();
  const t = useTranslations("admin.overview");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <SectionPanel title={t("provisionTitle")}>
        <ProjectProvisioningForm />
      </SectionPanel>

      <SectionPanel title={t("manageTitle")}>
        {isLoading && <p className="text-sm text-ink-muted">{t("loading")}</p>}
        {isError &&
          (error instanceof AdminPermissionError ? (
            <p className="text-sm text-ink-muted">{t("noAdminRole")}</p>
          ) : (
            <p className="text-sm text-critical">{t("loadError")}</p>
          ))}
        {!isLoading && !isError && (projects ?? []).length === 0 && (
          <p className="text-sm text-ink-muted">{t("empty")}</p>
        )}
        <ul className="flex flex-col gap-1.5">
          {(projects ?? []).map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/projects/${p.id}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:border-signal"
              >
                <span className="text-ink">{p.name}</span>
                <span className="font-mono text-xs text-ink-muted">
                  {p.event_start ? formatDate(p.event_start) : t("noEventDate")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </SectionPanel>
    </div>
  );
}
