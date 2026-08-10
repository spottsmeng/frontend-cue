"use client";

import { useParams } from "next/navigation";

import { ProjectMembersView } from "@/components/admin/project-members-view";

export default function AdminProjectMembersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectMembersView projectId={projectId} />;
}
