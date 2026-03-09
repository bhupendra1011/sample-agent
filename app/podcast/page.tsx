"use client";

import dynamic from "next/dynamic";

const PodcastLandingPage = dynamic(
  () => import("@/screens/podcast/PodcastLandingPage"),
  { ssr: false },
);

export default function PodcastLandingRoute() {
  return <PodcastLandingPage />;
}
