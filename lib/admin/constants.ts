import type { ConsentStatus, MembershipRole } from "@/lib/api/types";

/** Mirrors `app/api/schemas.py`'s `MembershipRoleLiteral` exactly (FR-ADM-01)
 * — every role a project membership or delegation can carry. */
export const MEMBERSHIP_ROLES: MembershipRole[] = [
  "project_manager",
  "producer",
  "finance",
  "account_manager",
  "designer",
  "administrator",
  "delegate",
  "read_only",
];

export const ROLE_LABEL: Record<MembershipRole, string> = {
  project_manager: "Project Manager",
  producer: "Producer",
  finance: "Finance",
  account_manager: "Account Manager",
  designer: "Designer",
  administrator: "Administrator",
  delegate: "Delegate",
  read_only: "Read only",
};

/** Mirrors `app/models/governance.py`'s `ConsentStatus` native enum. */
export const CONSENT_STATUSES: ConsentStatus[] = ["pending", "accepted", "objected", "opted_out"];

export const CONSENT_STATUS_LABEL: Record<ConsentStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  objected: "Objected",
  opted_out: "Opted out",
};
