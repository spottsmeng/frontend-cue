"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useCreateProjectMutation } from "@/lib/admin/projects-hooks";
import { MEMBERSHIP_ROLES, ROLE_LABEL } from "@/lib/admin/constants";
import type { MembershipCreate, MembershipRole } from "@/lib/api/types";

interface DraftMember {
  email: string;
  role: MembershipRole;
}

/**
 * FR-ADM-06: provisioning and initial member assignment as ONE flow ending
 * in ONE submit — the 10-minute bar this milestone's own READ FIRST section
 * names as a real, testable UX bar, not decoration. `ProjectCreate.members`
 * (schemas.py) is what makes this possible: the creator is granted
 * "administrator" automatically server-side, this form's own member rows
 * are for anyone else who needs access from the start (`add_member` /
 * `POST .../members` still exists standalone for later additions — see the
 * Members & Delegations screen — but this form never requires a second
 * request for the common "assign the crew now" case).
 *
 * No archetype/vertical picker — confirmed by reading
 * `app/twin/models.py`'s `MilestoneArchetype` docstring and the seed
 * migration directly: exactly one archetype and one vertical exist in the
 * whole system at v1 ("no tenant-authored archetype UI exists" — the
 * model's own words), so a picker would only ever offer one option. Both
 * fields are simply omitted from the request body; the backend resolves
 * each to its sole real default (`_resolve_archetype`, `vertical_code`'s
 * own schema default). See frontend/PROGRESS.md's F7 notes for the full
 * write-up of this judgment call.
 */
export function ProjectProvisioningForm() {
  const t = useTranslations("admin.provisioning");
  const router = useRouter();
  const createMutation = useCreateProjectMutation();

  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [venue, setVenue] = useState("");
  const [timezone, setTimezone] = useState("Asia/Singapore");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [draftEmail, setDraftEmail] = useState("");
  const [draftRole, setDraftRole] = useState<MembershipRole>("project_manager");

  function addMemberRow() {
    if (!draftEmail) return;
    setMembers([...members, { email: draftEmail, role: draftRole }]);
    setDraftEmail("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    const body: {
      name: string;
      client_name?: string | null;
      venue?: string | null;
      timezone: string;
      event_start?: string | null;
      event_end?: string | null;
      members: MembershipCreate[];
    } = {
      name,
      client_name: clientName || null,
      venue: venue || null,
      timezone,
      event_start: eventStart ? new Date(eventStart).toISOString() : null,
      event_end: eventEnd ? new Date(eventEnd).toISOString() : null,
      members: members.map((m) => ({ email: m.email, role: m.role })),
    };
    createMutation.mutate(body, {
      onSuccess: (project) => {
        if (project) router.push(`/admin/projects/${project.id}`);
      },
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-ink-secondary">
          {t("projectNameLabel")}
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("clientLabel")}
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("venueLabel")}
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("timezoneLabel")}
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 font-mono text-sm text-ink"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("eventStartLabel")}
          <input
            type="date"
            value={eventStart}
            onChange={(e) => setEventStart(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-ink-secondary">
          {t("eventEndLabel")}
          <input
            type="date"
            value={eventEnd}
            onChange={(e) => setEventEnd(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
          />
        </label>
      </div>

      <div className="rounded-md border border-border p-3">
        <p className="mb-2 text-xs uppercase tracking-wide text-ink-muted">
          {t("initialTeamNote")}
        </p>
        {members.length > 0 && (
          <ul className="mb-2 flex flex-col gap-1">
            {members.map((m, i) => (
              <li
                key={`${m.email}-${i}`}
                className="flex items-center justify-between rounded-md bg-surface-sunk px-2 py-1 text-sm"
              >
                <span className="text-ink">
                  {t("memberRow", { email: m.email, role: ROLE_LABEL[m.role] })}
                </span>
                <button
                  type="button"
                  onClick={() => setMembers(members.filter((_, idx) => idx !== i))}
                  className="text-xs text-critical hover:underline"
                >
                  {t("removeLabel")}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-ink-secondary">
            {t("emailLabel")}
            <input
              type="email"
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="mt-1 block w-56 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            />
          </label>
          <label className="text-xs text-ink-secondary">
            {t("roleLabel")}
            <select
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value as MembershipRole)}
              className="mt-1 block w-44 rounded-md border border-border bg-surface p-1.5 text-sm text-ink"
            >
              {MEMBERSHIP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addMemberRow}
            className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-ink-secondary hover:border-signal"
          >
            {t("addToTeam")}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">{t("memberNote")}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={createMutation.isPending || !name}
          className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {createMutation.isPending ? t("provisioning") : t("createProject")}
        </button>
        {createMutation.isError && (
          <p className="text-xs text-critical">
            {(createMutation.error as { detail?: string })?.detail ?? t("createErrorFallback")}
          </p>
        )}
      </div>
    </form>
  );
}
