"use client";

import dynamic from "next/dynamic";

const LandingScreen = dynamic(
  () => import("@/screens/LandingScreen"),
  { ssr: false }
);

export default function HomePage() {
  return <LandingScreen />;
}
