"use client";

import dynamic from "next/dynamic";
import useAppStore from "@/store/useAppStore";

const CreateMeetingScreen = dynamic(
  () => import("@/screens/CreateMeetingScreen"),
  { ssr: false }
);

const LandingScreen = dynamic(
  () => import("@/screens/LandingScreen"),
  { ssr: false }
);

export default function HomePage() {
  const user = useAppStore((state) => state.user);
  return user ? <CreateMeetingScreen /> : <LandingScreen />;
}
