"use client";

import { useParams } from "next/navigation";

import { LivingWipView } from "@/components/living-wip/living-wip-view";

export default function LivingWipPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <LivingWipView projectId={projectId} />;
}
