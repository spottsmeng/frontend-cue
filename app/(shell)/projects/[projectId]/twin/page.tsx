"use client";

import { useParams } from "next/navigation";

import { TwinView } from "@/components/twin/twin-view";

export default function TwinPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <TwinView projectId={projectId} />;
}
