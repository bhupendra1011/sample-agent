"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import useAppStore from "@/store/useAppStore";

/**
 * Syncs NextAuth session to Zustand user state so existing UI (MeetingAuthHeader,
 * app/page.tsx, app/join) keeps working without changes.
 */
export default function SessionSync() {
  const { data: session, status } = useSession();
  const setUser = useAppStore((state) => state.setUser);

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user) {
      setUser({
        displayName: session.user.name ?? "",
        email: session.user.email ?? "",
      });
    } else {
      setUser(null);
    }
  }, [session, status, setUser]);

  return null;
}
