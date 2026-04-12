// src/screens/podcast/PodcastSetupScreen.tsx
"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import usePodcastStore from "@/store/usePodcastStore";
import {
  HOST_AVATARS,
  GUEST_AVATARS,
  DEFAULT_HOST_AVATAR,
  DEFAULT_GUEST_AVATAR,
} from "@/config/podcast/avatars";
import {
  PODCAST_THEMES,
  LIGHTING_PRESETS,
  DEFAULT_THEME,
  DEFAULT_LIGHTING,
  getAmbientLightColor,
} from "@/config/podcast/themes";
import { showToast } from "@/services/uiService";
import type { PodcastAvatarConfig, PodcastStartResponse } from "@/types/podcast";
import PodcastAvatarCarousel from "@/components/podcast/PodcastAvatarCarousel";

const DURATIONS = [
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
  { label: "15 min", value: 900 },
];

const TOPICS = [
  "The future of AI and its impact on creative industries",
  "How space exploration will change in the next decade",
  "The science of happiness and what research tells us",
  "Sustainable technology and green innovation",
  "The evolution of music in the digital age",
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
  const [hostAvatar, setHostAvatar] = useState<PodcastAvatarConfig>(DEFAULT_HOST_AVATAR);
  const [guestAvatar, setGuestAvatar] = useState<PodcastAvatarConfig>(DEFAULT_GUEST_AVATAR);
  const [selectedTheme, setSelectedTheme] = useState(DEFAULT_THEME);
  const [selectedLighting, setSelectedLighting] = useState(DEFAULT_LIGHTING);
  const [avatarEnabled, setAvatarEnabled] = useState(false);
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
        avatarEnabled,
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
      setSession({ ...sessionData, hostAgentId: null, guestAgentId: null });
      setTimer({ duration, elapsed: 0, remaining: duration, phase: "intro" });
      await onStartPodcast(sessionData);
    } catch (error) {
      console.error("[PodcastSetup] Start error:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to start podcast",
        "error",
      );
      setStatus("idle");
    } finally {
      setIsStarting(false);
    }
  }, [
    topic, duration, hostAvatar, guestAvatar, selectedTheme, selectedLighting,
    avatarEnabled, setConfig, setStatus, setSession, setTimer, onStartPodcast,
  ]);

  const topicValid = topic.trim().length >= 10;

  return (
    <div className="min-h-dvh overflow-y-auto bg-[#080c14] text-gray-100 antialiased">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_35%_at_50%_0%,rgba(0,194,255,0.07),transparent)]" />
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-5 pb-8 pt-6 sm:px-6 sm:pt-8">
        {/* ── Header ── */}
        <header className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.push("/podcast")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-syne text-xl font-bold tracking-tight text-white sm:text-2xl">
              Create Podcast
            </h1>
            <p className="mt-0.5 text-xs tracking-wide text-gray-500">
              Set up your AI-powered conversation
            </p>
          </div>
        </header>

        <div className="space-y-5">
          {/* ── Topic ── */}
          <section>
            <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-gray-300">
              <svg className="h-3.5 w-3.5 text-[var(--agora-accent-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Podcast Topic
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What should the AI hosts discuss? Be specific…"
              maxLength={500}
              rows={2}
              className="w-full resize-none rounded-xl border-0 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-white/[0.06] transition-all focus:bg-white/[0.06] focus:outline-none focus:ring-[var(--agora-accent-blue)]/30"
            />
            <div className="mt-1.5 text-[11px] text-gray-600">
              {topic.length}/500
              {topic.length > 0 && topic.length < 10 && (
                <span className="ml-2 text-amber-500/80">Min 10 chars</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TOPICS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-500 ring-1 ring-inset ring-white/[0.04] transition-colors hover:bg-[var(--agora-accent-blue)]/8 hover:text-[var(--agora-accent-blue)] hover:ring-[var(--agora-accent-blue)]/15"
                >
                  {s.length > 38 ? `${s.slice(0, 36)}…` : s}
                </button>
              ))}
            </div>
          </section>

          {/* ── Duration & Avatars toggle — inline row ── */}
          <div className="flex flex-wrap items-start gap-4">
            {/* Duration */}
            <div className="flex-1 min-w-[200px]">
              <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-gray-300">
                <svg className="h-3.5 w-3.5 text-[var(--agora-accent-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Duration
              </label>
              <div className="flex gap-1.5">
                {DURATIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
                      duration === opt.value
                        ? "bg-[var(--agora-accent-blue)] text-white shadow-md shadow-[var(--agora-accent-blue)]/20"
                        : "bg-white/[0.04] text-gray-500 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.07] hover:text-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar toggle */}
            <div className="flex items-center gap-3 pt-7">
              <div className="text-right">
                <span className="block text-[13px] font-semibold text-gray-300">Avatars</span>
                <span className="text-[10px] text-gray-600">Anam faces</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={avatarEnabled}
                onClick={() => setAvatarEnabled(!avatarEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                  avatarEnabled ? "bg-[var(--agora-accent-blue)]" : "bg-white/[0.08]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    avatarEnabled ? "translate-x-[1.25rem]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ── Persona selection ── */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[13px] font-semibold text-gray-300">Choose Personas</span>
              <span className="rounded-md bg-[var(--agora-accent-blue)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--agora-accent-blue)]">
                Anam
              </span>
            </div>

            {/* Host */}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Host</span>
              </div>
              <PodcastAvatarCarousel
                avatars={HOST_AVATARS}
                selected={hostAvatar}
                onSelect={setHostAvatar}
              />
            </div>

            {/* Guest */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Guest</span>
              </div>
              <PodcastAvatarCarousel
                avatars={GUEST_AVATARS}
                selected={guestAvatar}
                onSelect={setGuestAvatar}
              />
            </div>
          </section>

          {/* ── Theme & Lighting ── */}
          <section>
            <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-gray-300">
              <svg className="h-3.5 w-3.5 text-[var(--agora-accent-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Visual Theme
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PODCAST_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme)}
                  className={`relative h-14 overflow-hidden rounded-xl transition-all sm:h-16 ${
                    selectedTheme.id === theme.id
                      ? "ring-2 ring-[var(--agora-accent-blue)] shadow-lg shadow-[var(--agora-accent-blue)]/10 scale-[1.03]"
                      : "opacity-50 hover:opacity-90"
                  }`}
                  style={{ background: theme.cssGradient }}
                >
                  <span className="absolute inset-x-0 bottom-1 text-center text-[10px] font-semibold text-white/90 drop-shadow-md">
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Lighting */}
            <div className="mt-3">
              <span className="mb-1.5 block text-[11px] font-medium text-gray-600">
                Ambient lighting
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {LIGHTING_PRESETS.map((preset) => {
                  const color = getAmbientLightColor(selectedTheme.accentColor, preset.id);
                  const active = selectedLighting.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedLighting(preset)}
                      className={`rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
                        active
                          ? "text-white shadow-sm"
                          : "bg-white/[0.03] text-gray-500 ring-1 ring-inset ring-white/[0.05] hover:text-gray-300"
                      }`}
                      style={active ? { backgroundColor: color } : undefined}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Summary + CTA ── */}
          <section className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.05]">
            {/* Summary row */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  <img
                    src={hostAvatar.imageUrl}
                    alt={hostAvatar.name}
                    className="h-9 w-9 rounded-full border-2 border-[#080c14] object-cover"
                  />
                  <img
                    src={guestAvatar.imageUrl}
                    alt={guestAvatar.name}
                    className="h-9 w-9 rounded-full border-2 border-[#080c14] object-cover"
                  />
                </div>
                <div className="text-sm font-medium text-gray-300">
                  {hostAvatar.name}{" "}
                  <span className="text-gray-600">vs</span>{" "}
                  {guestAvatar.name}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{DURATIONS.find((d) => d.value === duration)?.label}</span>
                <span
                  className="h-3 w-3 rounded"
                  style={{ background: selectedTheme.accentColor }}
                />
              </div>
            </div>

            {/* Start button */}
            <button
              type="button"
              onClick={handleStart}
              disabled={isStarting || !topicValid}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--agora-accent-blue)] py-3 text-[15px] font-bold text-white shadow-lg shadow-[var(--agora-accent-blue)]/20 transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none disabled:hover:brightness-100"
            >
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Starting…
                </span>
              ) : (
                "Start Podcast"
              )}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PodcastSetupScreen;
