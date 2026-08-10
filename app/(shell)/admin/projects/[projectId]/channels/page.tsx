"use client";

import { useParams } from "next/navigation";

import { ProjectChannelsView } from "@/components/admin/project-channels-view";

export default function AdminProjectChannelsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectChannelsView projectId={projectId} />;
}
