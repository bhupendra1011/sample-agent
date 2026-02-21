"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAppStore from "@/store/useAppStore";
import { useAgora } from "@/hooks/useAgora";
import { showToast } from "@/services/uiService";

const AGORA_CONVO_AI_URL =
  "https://www.agora.io/en/products/conversational-ai-engine/";

const LandingScreen: React.FC = () => {
  const router = useRouter();
  const callStart = useAppStore((state) => state.callStart);
  const { joinMeeting } = useAgora();

  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStartConversation = useCallback(async () => {
    const userName = name.trim();
    if (!userName) {
      showToast("Please enter your name.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-agora-token");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Failed to get token",
        );
      }
      const { token, uid, channel } = (await res.json()) as {
        token: string;
        uid: number;
        channel: string;
      };

      await joinMeeting(
        token,
        token,
        Number(uid),
        channel,
        "My First Convo AI App",
        userName,
      );

      callStart({
        userName,
        uid: String(uid),
        meetingName: "My First Convo AI App",
        channelId: channel,
        isHost: true,
      });

      router.push("/call");
    } catch (error) {
      console.error("Failed to start conversation:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to start conversation. Please try again.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [name, joinMeeting, callStart, router]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      {/* Background: gradient mesh + subtle grain (slow float for depth) */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,194,255,0.12),transparent_50%)] animate-landing-bg-float origin-center" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(0,194,255,0.08),transparent_45%)] animate-landing-bg-float-secondary origin-center" />
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Content */}
      <main className="relative flex flex-col flex-1 items-center justify-between px-4 sm:px-6 pt-12 sm:pt-16 pb-8 sm:pb-12">
        {/* Top spacer */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl text-center">
          {/* Staggered reveal */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-4 sm:mb-6 animate-fade-in-up font-syne"
            style={{
              animationDelay: "0.1s",
              animationFillMode: "backwards",
            }}
          >
            Experience
            <br />
            <span className="bg-[linear-gradient(to_right,var(--agora-accent-blue),#33d1ff)] bg-clip-text text-transparent animate-landing-gradient-shimmer inline-block">
              Conversational AI
            </span>
          </h1>
          <p
            className="text-gray-400 text-base sm:text-lg max-w-md mx-auto mb-8 sm:mb-10 animate-fade-in-up"
            style={{
              animationDelay: "0.3s",
              animationFillMode: "backwards",
            }}
          >
            Real-time voice / video calling agents that understand and respond
            naturally—powered by Agora.
          </p>
          <Link
            href={AGORA_CONVO_AI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-medium transition-colors duration-200 underline underline-offset-4 animate-fade-in-up [color:var(--agora-accent-blue)] hover:opacity-90 decoration-[var(--agora-accent-blue)]"
            style={{
              animationDelay: "0.5s",
              animationFillMode: "backwards",
            }}
          >
            Learn more about Agora Conversational AI
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Link>
        </div>

        {/* Bottom center: Name input + Start Conversation */}
        <div
          className="flex flex-col items-center gap-4 animate-fade-in-up w-full max-w-sm"
          style={{
            animationDelay: "0.7s",
            animationFillMode: "backwards",
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStartConversation()}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl bg-white/5 dark:bg-gray-800/80 border border-gray-600 dark:border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--agora-accent-blue)] focus:border-transparent transition-colors"
            disabled={isLoading}
            aria-label="Your name"
          />
          <div className="relative rounded-xl animate-landing-button-glow w-full">
            <button
              type="button"
              onClick={handleStartConversation}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--agora-accent-blue)] text-white font-semibold shadow-lg hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="animate-pulse">Connecting…</span>
              ) : (
                "Start Conversation"
              )}
            </button>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm text-center max-w-xs">
            Enter your name and start a voice/video call with an AI agent.
          </p>
        </div>
      </main>
    </div>
  );
};

export default LandingScreen;
