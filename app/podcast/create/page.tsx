"use client";

import dynamic from "next/dynamic";

const PodcastPage = dynamic(
  () => import("@/screens/podcast/PodcastPage"),
  { ssr: false },
);

export default function PodcastCreateRoute() {
  return <PodcastPage />;
}
