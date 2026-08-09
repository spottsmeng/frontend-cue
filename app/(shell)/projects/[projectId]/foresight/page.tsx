"use client";

import { useParams } from "next/navigation";

import { ForesightView } from "@/components/foresight/foresight-view";

export default function ForesightPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ForesightView projectId={projectId} />;
}
