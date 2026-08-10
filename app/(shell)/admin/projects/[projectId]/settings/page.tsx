"use client";

import { useParams } from "next/navigation";

import { ProjectSettingsView } from "@/components/admin/project-settings-view";

export default function AdminProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectSettingsView projectId={projectId} />;
}
