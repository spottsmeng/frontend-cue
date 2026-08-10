"use client";

import { useParams } from "next/navigation";

import { ProjectConsentView } from "@/components/admin/project-consent-view";

export default function AdminProjectConsentPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectConsentView projectId={projectId} />;
}
