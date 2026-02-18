"use client";

import dynamic from "next/dynamic";
import MeetingLoadingSkeleton from "@/components/MeetingLoadingSkeleton";

const VideoCallScreen = dynamic(
  () => import("@/screens/VideoCallScreen"),
  { ssr: false, loading: () => <MeetingLoadingSkeleton /> }
);

export default function CallPage() {
  return <VideoCallScreen />;
}
