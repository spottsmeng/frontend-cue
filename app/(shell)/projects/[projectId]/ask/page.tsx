"use client";

import { useParams } from "next/navigation";

import { AskView } from "@/components/ask/ask-view";

export default function AskPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <AskView projectId={projectId} />;
}
