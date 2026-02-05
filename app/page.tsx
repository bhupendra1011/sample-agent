"use client";

import dynamic from "next/dynamic";

const CreateMeetingScreen = dynamic(
  () => import("@/screens/CreateMeetingScreen"),
  { ssr: false }
);

export default function HomePage() {
  return <CreateMeetingScreen />;
}
