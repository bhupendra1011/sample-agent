// src/screens/podcast/PodcastLandingPage.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const features = [
  {
    title: "Dual AI Agents",
    description:
      "Two distinct AI personalities engage in natural, dynamic conversation on any topic you choose.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: "Anam Avatars",
    description:
      "Lifelike avatars that lip-sync with speech in real-time, powered by Anam's streaming avatar technology.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Live Transcript",
    description:
      "Follow the conversation with real-time transcription, auto-scrolling as the hosts speak.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Audience Chat",
    description:
      "Send messages and ask questions that the AI host can pick up and address live on-air.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

const PodcastLandingPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      {/* Background: gradient mesh + subtle grain */}
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
      <main className="relative flex flex-col flex-1 items-center px-4 sm:px-6 pt-12 sm:pt-20 pb-8 sm:pb-12">
        {/* Hero section */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl text-center">
          {/* Badge */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "0.1s", animationFillMode: "backwards" }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--agora-accent-blue)]/20 bg-[var(--agora-accent-blue)]/5 text-sm text-[var(--agora-accent-blue)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--agora-accent-blue)] animate-pulse" />
              Powered by Agora ConvoAI
            </span>
          </div>

          {/* Title */}
          <h1
            className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white animate-fade-in-up font-syne"
            style={{ animationDelay: "0.2s", animationFillMode: "backwards" }}
          >
            AI Podcast
            <br />
            <span className="bg-[linear-gradient(to_right,var(--agora-accent-blue),#33d1ff)] bg-clip-text text-transparent animate-landing-gradient-shimmer inline-block">
              Studio
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="mt-5 text-gray-400 text-base sm:text-lg max-w-xl mx-auto animate-fade-in-up"
            style={{ animationDelay: "0.35s", animationFillMode: "backwards" }}
          >
            Create immersive AI-generated podcast conversations. Two AI agents
            discuss any topic while you watch with lifelike avatars, live
            transcripts, and interactive chat.
          </p>

          {/* Learn more link */}
          <Link
            href="https://www.agora.io/en/products/conversational-ai-engine/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 font-medium transition-colors duration-200 underline underline-offset-4 animate-fade-in-up [color:var(--agora-accent-blue)] hover:opacity-90 decoration-[var(--agora-accent-blue)] text-sm"
            style={{ animationDelay: "0.45s", animationFillMode: "backwards" }}
          >
            Learn more about Agora Conversational AI
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>

          {/* Feature grid */}
          <div
            className="mt-12 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up"
            style={{ animationDelay: "0.55s", animationFillMode: "backwards" }}
          >
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[var(--agora-accent-blue)]/20 transition-colors group text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--agora-accent-blue)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--agora-accent-blue)]/15 transition-colors text-[var(--agora-accent-blue)]">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          className="mt-12 flex flex-col items-center gap-4 animate-fade-in-up w-full max-w-sm"
          style={{ animationDelay: "0.7s", animationFillMode: "backwards" }}
        >
          <div className="relative rounded-xl animate-landing-button-glow w-full">
            <button
              type="button"
              onClick={() => router.push("/podcast/create")}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--agora-accent-blue)] text-white font-semibold shadow-lg hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
            >
              Create Your Podcast
            </button>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm text-center max-w-xs">
            Pick a topic, choose avatars, and let two AI agents have a live conversation.
          </p>
        </div>
      </main>
    </div>
  );
};

export default PodcastLandingPage;
