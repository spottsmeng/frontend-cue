"use client";

import { useParams } from "next/navigation";

import { DocumentDetailView } from "@/components/documents/document-detail-view";

export default function DocumentDetailPage() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  return <DocumentDetailView projectId={projectId} documentId={documentId} />;
}
