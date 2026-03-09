import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Podcast Studio",
  description: "Create immersive AI-generated podcast conversations with two AI agents.",
};

export default function PodcastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
