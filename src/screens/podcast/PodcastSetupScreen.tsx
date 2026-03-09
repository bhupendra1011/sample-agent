// src/screens/podcast/PodcastSetupScreen.tsx
"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import usePodcastStore from "@/store/usePodcastStore";
import { HOST_AVATARS, GUEST_AVATARS } from "@/config/podcast/avatars";
import {
  PODCAST_THEMES,
  LIGHTING_PRESETS,
  DEFAULT_THEME,
  DEFAULT_LIGHTING,
} from "@/config/podcast/themes";
import { showToast } from "@/services/uiService";
import type { PodcastAvatarConfig, PodcastStartResponse } from "@/types/podcast";

const DURATION_OPTIONS = [
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
  { label: "15 min", value: 900 },
];

const TOPIC_SUGGESTIONS = [
  "The future of AI and its impact on creative industries",
  "How space exploration will change in the next decade",
  "The science of happiness and what research tells us",
  "Sustainable technology and green innovation",
  "The evolution of music in the digital age",
];

// Gradient pairs for avatar placeholders
const HOST_GRADIENTS = [
  "from-blue-500 to-cyan-400",
  "from-indigo-500 to-blue-400",
  "from-violet-500 to-indigo-400",
];
const GUEST_GRADIENTS = [
  "from-rose-500 to-pink-400",
  "from-amber-500 to-orange-400",
  "from-emerald-500 to-teal-400",
  "from-fuchsia-500 to-pink-400",
];

interface PodcastSetupScreenProps {
  onStartPodcast: (sessionData: PodcastStartResponse) => Promise<void>;
}

const PodcastSetupScreen: React.FC<PodcastSetupScreenProps> = ({
  onStartPodcast,
}) => {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(300);
  const [hostAvatar, setHostAvatar] = useState<PodcastAvatarConfig>(
    HOST_AVATARS[0]
  );
  const [guestAvatar, setGuestAvatar] = useState<PodcastAvatarConfig>(
    GUEST_AVATARS[0]
  );
  const [selectedTheme, setSelectedTheme] = useState(DEFAULT_THEME);
  const [selectedLighting, setSelectedLighting] = useState(DEFAULT_LIGHTING);
  const [isStarting, setIsStarting] = useState(false);

  const setConfig = usePodcastStore((s) => s.setConfig);
  const setStatus = usePodcastStore((s) => s.setStatus);
  const setSession = usePodcastStore((s) => s.setSession);
  const setTimer = usePodcastStore((s) => s.setTimer);

  const handleStart = useCallback(async () => {
    if (topic.trim().length < 10) {
      showToast("Please enter a topic (at least 10 characters)", "warning");
      return;
    }

    setIsStarting(true);
    setStatus("loading");

    try {
      setConfig({
        topic: topic.trim(),
        duration,
        hostAvatar,
        guestAvatar,
        theme: selectedTheme,
        lighting: selectedLighting,
      });

      const response = await fetch("/api/podcast/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          duration,
          hostAvatarId: hostAvatar.anamAvatarId,
          guestAvatarId: guestAvatar.anamAvatarId,
          themeId: selectedTheme.id,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to start podcast session");
      }

      const sessionData = (await response.json()) as PodcastStartResponse;

      setSession({
        ...sessionData,
        hostAgentId: null,
        guestAgentId: null,
      });

      setTimer({
        duration,
        elapsed: 0,
        remaining: duration,
        phase: "intro",
      });

      await onStartPodcast(sessionData);
    } catch (error) {
      console.error("[PodcastSetup] Start error:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to start podcast",
        "error"
      );
      setStatus("idle");
    } finally {
      setIsStarting(false);
    }
  }, [
    topic,
    duration,
    hostAvatar,
    guestAvatar,
    selectedTheme,
    selectedLighting,
    setConfig,
    setStatus,
    setSession,
    setTimer,
    onStartPodcast,
  ]);

  const topicValid = topic.trim().length >= 10;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,194,255,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_100%,rgba(0,194,255,0.05),transparent_45%)]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back + Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/podcast")}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            aria-label="Back to podcast home"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-syne">
              Create Podcast
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Set up your AI-powered conversation
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* ── Topic ── */}
          <section className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              <span className="inline-flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[var(--agora-accent-blue)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                Podcast Topic
              </span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What should the AI hosts discuss? Be specific for the best results..."
              maxLength={500}
              rows={3}
              className="w-full bg-gray-900/60 border border-white/[0.08] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--agora-accent-blue)]/50 focus:ring-1 focus:ring-[var(--agora-accent-blue)]/30 resize-none transition-colors text-sm"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-600">
                {topic.length}/500
                {topic.length > 0 && topic.length < 10 && (
                  <span className="text-amber-500 ml-2">
                    Need at least 10 characters
                  </span>
                )}
              </span>
            </div>
            {/* Suggestions */}
            <div className="flex flex-wrap gap-2 mt-3">
              {TOPIC_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setTopic(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[var(--agora-accent-blue)]/10 text-gray-400 hover:text-[var(--agora-accent-blue)] transition-colors border border-white/[0.06] hover:border-[var(--agora-accent-blue)]/20"
                >
                  {s.length > 45 ? s.slice(0, 42) + "..." : s}
                </button>
              ))}
            </div>
          </section>

          {/* ── Duration ── */}
          <section className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              <span className="inline-flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[var(--agora-accent-blue)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Duration
              </span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className={`py-2.5 rounded-lg font-medium text-sm transition-all ${
                    duration === opt.value
                      ? "bg-[var(--agora-accent-blue)] text-white shadow-lg shadow-[var(--agora-accent-blue)]/20"
                      : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Avatars ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Host */}
            <section className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Host
                </span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {HOST_AVATARS.map((avatar, idx) => (
                  <button
                    key={avatar.id}
                    onClick={() => setHostAvatar(avatar)}
                    className={`relative p-3 rounded-xl transition-all text-center group ${
                      hostAvatar.id === avatar.id
                        ? "bg-[var(--agora-accent-blue)]/10 border-2 border-[var(--agora-accent-blue)]/50 shadow-lg shadow-[var(--agora-accent-blue)]/10"
                        : "bg-white/[0.03] border-2 border-transparent hover:border-white/10"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${HOST_GRADIENTS[idx % HOST_GRADIENTS.length]} flex items-center justify-center text-xl font-bold text-white shadow-lg group-hover:scale-105 transition-transform`}
                    >
                      {avatar.name[0]}
                    </div>
                    <span className="block mt-2 text-xs font-medium text-white">
                      {avatar.name}
                    </span>
                    {hostAvatar.id === avatar.id && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--agora-accent-blue)]" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Guest */}
            <section className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Guest
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {GUEST_AVATARS.map((avatar, idx) => (
                  <button
                    key={avatar.id}
                    onClick={() => setGuestAvatar(avatar)}
                    className={`relative p-3 rounded-xl transition-all text-center group ${
                      guestAvatar.id === avatar.id
                        ? "bg-[var(--agora-accent-blue)]/10 border-2 border-[var(--agora-accent-blue)]/50 shadow-lg shadow-[var(--agora-accent-blue)]/10"
                        : "bg-white/[0.03] border-2 border-transparent hover:border-white/10"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br ${GUEST_GRADIENTS[idx % GUEST_GRADIENTS.length]} flex items-center justify-center text-lg font-bold text-white shadow-lg group-hover:scale-105 transition-transform`}
                    >
                      {avatar.name[0]}
                    </div>
                    <span className="block mt-2 text-xs font-medium text-white">
                      {avatar.name}
                    </span>
                    {guestAvatar.id === avatar.id && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--agora-accent-blue)]" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* ── Theme & Lighting ── */}
          <section className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              <span className="inline-flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[var(--agora-accent-blue)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
                Visual Theme
              </span>
            </label>
            <div className="grid grid-cols-5 gap-3 mb-5">
              {PODCAST_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme)}
                  className={`relative h-16 rounded-xl overflow-hidden transition-all ${
                    selectedTheme.id === theme.id
                      ? "ring-2 ring-[var(--agora-accent-blue)] scale-105 shadow-lg"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  style={{ background: theme.cssGradient }}
                >
                  <span className="absolute bottom-1 inset-x-0 text-center text-[10px] font-medium text-white/90 drop-shadow-lg">
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>

            <label className="block text-xs font-medium text-gray-400 mb-2">
              Lighting
            </label>
            <div className="grid grid-cols-4 gap-3">
              {LIGHTING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedLighting(preset)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedLighting.id === preset.id
                      ? "bg-[var(--agora-accent-blue)] text-white"
                      : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]"
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </section>

          {/* ── Preview summary ── */}
          <section className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${HOST_GRADIENTS[HOST_AVATARS.indexOf(hostAvatar) % HOST_GRADIENTS.length]} flex items-center justify-center text-xs font-bold text-white`}
                  >
                    {hostAvatar.name[0]}
                  </div>
                  <span className="text-gray-400">{hostAvatar.name}</span>
                </div>
                <span className="text-gray-600">vs</span>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${GUEST_GRADIENTS[GUEST_AVATARS.indexOf(guestAvatar) % GUEST_GRADIENTS.length]} flex items-center justify-center text-xs font-bold text-white`}
                  >
                    {guestAvatar.name[0]}
                  </div>
                  <span className="text-gray-400">{guestAvatar.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-500 text-xs">
                <span>{DURATION_OPTIONS.find((d) => d.value === duration)?.label}</span>
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ background: selectedTheme.accentColor }}
                />
              </div>
            </div>
          </section>

          {/* ── Start Button ── */}
          <div className="relative rounded-xl animate-landing-button-glow">
            <button
              onClick={handleStart}
              disabled={isStarting || !topicValid}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[var(--agora-accent-blue)] text-white font-semibold text-base shadow-lg hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isStarting ? (
                <span className="flex items-center gap-3">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Starting Podcast...
                </span>
              ) : (
                "Start Podcast"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastSetupScreen;
