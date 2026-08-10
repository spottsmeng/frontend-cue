"use client";

import { useParams } from "next/navigation";

import { ProjectExportView } from "@/components/admin/project-export-view";

export default function AdminProjectExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectExportView projectId={projectId} />;
}
