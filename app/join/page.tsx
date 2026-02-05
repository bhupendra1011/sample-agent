"use client";

import dynamic from "next/dynamic";

const JoinMeetingScreen = dynamic(
  () => import("@/screens/JoinMeetingScreen"),
  { ssr: false }
);

export default function JoinPage() {
  return <JoinMeetingScreen />;
}
