// src/screens/podcast/PodcastSetupScreen.tsx
"use client";

import React, { useState, useCallback } from "react";
import usePodcastStore from "@/store/usePodcastStore";
import { HOST_AVATARS, GUEST_AVATARS } from "@/config/podcast/avatars";
import { PODCAST_THEMES, LIGHTING_PRESETS, DEFAULT_THEME, DEFAULT_LIGHTING } from "@/config/podcast/themes";
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

interface PodcastSetupScreenProps {
  onStartPodcast: (sessionData: PodcastStartResponse) => Promise<void>;
}

const PodcastSetupScreen: React.FC<PodcastSetupScreenProps> = ({ onStartPodcast }) => {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(300);
  const [hostAvatar, setHostAvatar] = useState<PodcastAvatarConfig>(HOST_AVATARS[0]);
  const [guestAvatar, setGuestAvatar] = useState<PodcastAvatarConfig>(GUEST_AVATARS[0]);
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
      // Save config
      setConfig({
        topic: topic.trim(),
        duration,
        hostAvatar,
        guestAvatar,
        theme: selectedTheme,
        lighting: selectedLighting,
      });

      // 1. Start podcast session (get tokens + UIDs)
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

      // Save session to store
      setSession({
        ...sessionData,
        hostAgentId: null,
        guestAgentId: null,
      });

      // Set timer
      setTimer({
        duration,
        elapsed: 0,
        remaining: duration,
        phase: "intro",
      });

      // Pass session data to parent for RTC/RTM join + agent invitation
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
    setConfig, setStatus, setSession, setTimer, onStartPodcast,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Create Your Podcast
          </h1>
          <p className="text-gray-400 mt-2">Set up your AI podcast conversation</p>
        </div>

        {/* Topic */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Podcast Topic
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What should the podcast be about?"
            maxLength={500}
            rows={3}
            className="w-full bg-gray-900/80 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">{topic.length}/500</span>
          </div>
          {/* Suggestions */}
          <div className="flex flex-wrap gap-2 mt-3">
            {TOPIC_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setTopic(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700 hover:border-gray-600"
              >
                {suggestion.slice(0, 40)}...
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Duration
          </label>
          <div className="grid grid-cols-4 gap-3">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                className={`py-3 rounded-xl font-medium transition-all ${
                  duration === opt.value
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Host Avatar */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Host
          </label>
          <div className="grid grid-cols-3 gap-3">
            {HOST_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setHostAvatar(avatar)}
                className={`relative p-4 rounded-xl transition-all text-center ${
                  hostAvatar.id === avatar.id
                    ? "bg-purple-600/20 border-2 border-purple-500 shadow-lg shadow-purple-500/10"
                    : "bg-gray-800 border-2 border-transparent hover:border-gray-600"
                }`}
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl font-bold">
                  {avatar.name[0]}
                </div>
                <span className="block mt-2 text-sm font-medium">{avatar.name}</span>
                <span className="block text-xs text-gray-500">Host</span>
              </button>
            ))}
          </div>
        </div>

        {/* Guest Avatar */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Guest
          </label>
          <div className="grid grid-cols-4 gap-3">
            {GUEST_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setGuestAvatar(avatar)}
                className={`relative p-4 rounded-xl transition-all text-center ${
                  guestAvatar.id === avatar.id
                    ? "bg-pink-600/20 border-2 border-pink-500 shadow-lg shadow-pink-500/10"
                    : "bg-gray-800 border-2 border-transparent hover:border-gray-600"
                }`}
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-xl font-bold">
                  {avatar.name[0]}
                </div>
                <span className="block mt-2 text-sm font-medium">{avatar.name}</span>
                <span className="block text-xs text-gray-500">Guest</span>
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Theme
          </label>
          <div className="grid grid-cols-5 gap-3">
            {PODCAST_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`relative h-20 rounded-xl overflow-hidden transition-all ${
                  selectedTheme.id === theme.id
                    ? "ring-2 ring-purple-400 scale-105"
                    : "opacity-70 hover:opacity-100"
                }`}
                style={{ background: theme.cssGradient }}
              >
                <span className="absolute bottom-1.5 inset-x-0 text-center text-xs font-medium text-white drop-shadow-lg">
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lighting */}
        <div className="mb-10">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Lighting
          </label>
          <div className="grid grid-cols-4 gap-3">
            {LIGHTING_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedLighting(preset)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  selectedLighting.id === preset.id
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isStarting || topic.trim().length < 10}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
        >
          {isStarting ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Starting Podcast...
            </span>
          ) : (
            "Start Podcast"
          )}
        </button>
      </div>
    </div>
  );
};

export default PodcastSetupScreen;
