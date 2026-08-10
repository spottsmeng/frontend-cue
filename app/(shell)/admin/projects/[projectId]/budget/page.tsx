"use client";

import { useParams } from "next/navigation";

import { ProjectBudgetView } from "@/components/admin/project-budget-view";

export default function AdminProjectBudgetPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectBudgetView projectId={projectId} />;
}
