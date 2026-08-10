"use client";

import { useParams } from "next/navigation";

import { DocumentsView } from "@/components/documents/documents-view";

export default function DocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <DocumentsView projectId={projectId} />;
}
