"use client";

import { useParams } from "next/navigation";

import { ChannelMessagesView } from "@/components/admin/channel-messages-view";

export default function AdminChannelMessagesPage() {
  const { projectId, channelId } = useParams<{ projectId: string; channelId: string }>();
  return <ChannelMessagesView projectId={projectId} channelId={channelId} />;
}
