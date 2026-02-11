"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAppStore from "@/store/useAppStore";

const JoinMeetingScreen = dynamic(
  () => import("@/screens/JoinMeetingScreen"),
  { ssr: false }
);

export default function JoinPage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);

  useEffect(() => {
    if (user === null) {
      router.replace("/");
    }
  }, [user, router]);

  if (user === null) return null;
  return <JoinMeetingScreen />;
}
