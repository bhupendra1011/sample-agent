"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const VideoCallScreen = dynamic(
  () => import("@/screens/VideoCallScreen"),
  { ssr: false }
);

export default function CallPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = use(params);
  return <VideoCallScreen channelId={channelId} />;
}
