// src/screens/podcast/PodcastPage.tsx
// Orchestrator: manages phases and wires hooks to components.
"use client";

import React, { useCallback } from "react";
import usePodcastStore from "@/store/usePodcastStore";
import { EAgentState } from "@/types/agora";
import type { AgentSettings } from "@/types/agora";
import { showToast } from "@/services/uiService";
import { inviteAgent } from "@/api/agentApi";
import { ConversationalAIAPI } from "@/conversational-ai-api";
import type { PodcastStartResponse, PodcastTheme, LightingPreset } from "@/types/podcast";
import {
  buildHostSystemPrompt,
  buildGuestSystemPrompt,
  buildHostGreeting,
} from "@/config/podcast/prompts";

import { usePodcastRTC } from "@/hooks/podcast/usePodcastRTC";
import { usePodcastRTM } from "@/hooks/podcast/usePodcastRTM";
import { usePodcastTranscript } from "@/hooks/podcast/usePodcastTranscript";
import { useAmbience } from "@/hooks/podcast/useAmbience";

import PodcastSetupScreen from "./PodcastSetupScreen";
import PodcastStudioScreen from "./PodcastStudioScreen";
import PodcastEndedScreen from "./PodcastEndedScreen";

// Two Anam API keys — one per avatar agent to avoid concurrency limits
const ANAM_API_KEY_HOST = process.env.NEXT_PUBLIC_ANAM_PODCAST_KEY_HOST ?? "";
const ANAM_API_KEY_GUEST = process.env.NEXT_PUBLIC_ANAM_PODCAST_KEY_GUEST ?? "";

if (typeof window !== "undefined") {
  if (!ANAM_API_KEY_HOST) console.warn("[PodcastPage] NEXT_PUBLIC_ANAM_PODCAST_KEY_HOST is empty — restart dev server after adding .env vars");
  if (!ANAM_API_KEY_GUEST) console.warn("[PodcastPage] NEXT_PUBLIC_ANAM_PODCAST_KEY_GUEST is empty — restart dev server after adding .env vars");
}

const PodcastPage: React.FC = () => {
  const status = usePodcastStore((s) => s.status);
  const config = usePodcastStore((s) => s.config);
  const session = usePodcastStore((s) => s.session);
  const setStatus = usePodcastStore((s) => s.setStatus);
  const setSession = usePodcastStore((s) => s.setSession);
  const setHostAgent = usePodcastStore((s) => s.setHostAgent);
  const setGuestAgent = usePodcastStore((s) => s.setGuestAgent);
  const setConfig = usePodcastStore((s) => s.setConfig);
  const setAmbienceVolume = usePodcastStore((s) => s.setAmbienceVolume);

  // Default UIDs for hooks (will be overridden when session starts)
  const hostRtcUid = session?.hostRtcUid ?? 1001;
  const guestRtcUid = session?.guestRtcUid ?? 1002;
  const hostAvatarUid = session?.hostAvatarUid ?? 999998;
  const guestAvatarUid = session?.guestAvatarUid ?? 999999;

  // Hooks
  const podcastRTC = usePodcastRTC({
    hostRtcUid,
    guestRtcUid,
    hostAvatarUid,
    guestAvatarUid,
  });

  const podcastRTM = usePodcastRTM({ hostRtcUid, guestName: config?.guestAvatar.name });
  const ambience = useAmbience();

  usePodcastTranscript({
    rtcClient: podcastRTC.rtcClient,
    rtmClient: podcastRTM.rtmClient,
    channelId: session?.channel ?? null,
    hostRtcUid,
    guestRtcUid,
    hostName: config?.hostAvatar.name ?? "Host",
    guestName: config?.guestAvatar.name ?? "Guest",
    isActive: status === "live" || status === "wrapping-up",
    sessionId: session?.sessionId ?? null,
  });

  // Voice-based turn detection: agents hear each other directly via audio.
  // No text relay needed — VAD handles turn-taking naturally.

  // Build agent settings for invitation
  const buildAgentSettings = useCallback(
    (
      role: "host" | "guest",
      sessionData: PodcastStartResponse,
      cfg: typeof config,
    ): AgentSettings => {
      if (!cfg) throw new Error("Config not set");

      const isHost = role === "host";
      const avatar = isHost ? cfg.hostAvatar : cfg.guestAvatar;
      const systemPrompt = isHost
        ? buildHostSystemPrompt(cfg.topic, cfg.hostAvatar.name, cfg.guestAvatar.name)
        : buildGuestSystemPrompt(cfg.topic, cfg.guestAvatar.name, cfg.hostAvatar.name);

      return {
        name: `podcast-${role}-${sessionData.sessionId}`,
        agent_rtc_uid: isHost ? sessionData.hostRtcUid : sessionData.guestRtcUid,
        // Each agent subscribes to the OTHER agent's audio.
        // When avatars are enabled, audio is published via the avatar UID, not the agent RTC UID.
        remote_rtc_uids: cfg.avatarEnabled
          ? (isHost
              ? [String(sessionData.guestAvatarUid)]
              : [String(sessionData.hostAvatarUid)])
          : (isHost
              ? [String(sessionData.guestRtcUid)]
              : [String(sessionData.hostRtcUid)]),
        llm: {
          url: "https://api.openai.com/v1/chat/completions",
          api_key: "***MASKED***",
          system_messages: [{ role: "system", content: systemPrompt }],
          // Host gets a greeting (opens the show). Guest joins silently — intro triggered via one chat after host finishes.
          greeting_message: isHost
            ? buildHostGreeting(cfg.hostAvatar.name, cfg.guestAvatar.name, cfg.topic)
            : "__NONE__",
          greeting_configs: isHost ? { mode: "single_first" } : undefined,
          max_history: 20,
          params: { model: "gpt-4o-mini", max_tokens: 512, temperature: 0.7 },
          input_modalities: ["text"],
        },
        tts: {
          vendor: "elevenlabs",
          params: {
            key: "***MASKED***",
            voice_id: avatar.defaultVoiceName,
            sample_rate: 24000,
          },
        },
        asr: { vendor: "ares" },
        idle_timeout: 600,
        // Turn detection for agent-to-agent.
        // Using "adaptive" interrupt_mode: dynamically increases threshold while speaking
        // to reduce accidental interruptions from the other agent's audio.
        enable_turn_detection: true,
        // Using deprecated params (still work at API level) for adaptive mode
        turn_detection: {
          // Adaptive mode: agent raises its interrupt threshold while speaking,
          // making it harder for TTS from the other agent to trigger false interrupts
          interrupt_mode: "adaptive",
          threshold: 0.7, // Higher base threshold
          silence_duration_ms: 1500, // Wait 1.5s of silence before responding
          interrupt_duration_ms: 800, // ~0.8s of speech needed to interrupt
          prefix_padding_ms: 300, // Minimal padding
        } as Record<string, unknown>,
        advanced_features: { enable_rtm: true, enable_tools: false },
        parameters: { data_channel: "rtm" },
        // Conditionally enable Anam avatar based on user toggle
        ...(cfg.avatarEnabled
          ? {
              avatar: {
                enable: true,
                vendor: "anam" as const,
                params: {
                  api_key: isHost ? ANAM_API_KEY_HOST : ANAM_API_KEY_GUEST,
                  agora_uid: String(
                    isHost ? sessionData.hostAvatarUid : sessionData.guestAvatarUid,
                  ),
                  avatar_id: avatar.anamAvatarId,
                },
              },
            }
          : {}),
      };
    },
    [],
  );

  // Start podcast flow
  const handleStartPodcast = useCallback(
    async (sessionData: PodcastStartResponse) => {
      const cfg = usePodcastStore.getState().config;
      if (!cfg) return;

      try {
        // 1. Join RTC as audience
        await podcastRTC.joinAsAudience(
          sessionData.rtcToken,
          sessionData.uid,
          sessionData.channel,
        );

        // 2. Join RTM
        await podcastRTM.joinRTM(
          sessionData.rtmToken,
          sessionData.uid,
          sessionData.channel,
        );

        // 3. Load ambience + init ConversationalAIAPI early (transcript/RTM use getInstance())
        ambience.loadTheme(cfg.theme);
        ConversationalAIAPI.init({
          rtcEngine: podcastRTC.rtcClient!,
          rtmEngine: podcastRTM.rtmClient,
          enableLog: true,
        });

        // 4. Invite Host agent (speaks greeting immediately on join)
        const hostSettings = buildAgentSettings("host", sessionData, cfg);
        const hostResult = await inviteAgent(
          sessionData.channel,
          String(sessionData.uid),
          hostSettings,
        );

        setHostAgent({
          agentId: hostResult.agentId,
          rtcUid: sessionData.hostRtcUid,
          avatarUid: sessionData.hostAvatarUid,
          state: EAgentState.IDLE,
        });

        // 5. Brief stagger — just ensure both agents are in channel
        // VAD handles turn-taking automatically since they subscribe to each other's audio
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const guestSettings = buildAgentSettings("guest", sessionData, cfg);
        const guestResult = await inviteAgent(
          sessionData.channel,
          String(sessionData.uid),
          guestSettings,
        );

        setGuestAgent({
          agentId: guestResult.agentId,
          rtcUid: sessionData.guestRtcUid,
          avatarUid: sessionData.guestAvatarUid,
          state: EAgentState.IDLE,
        });

        const currentSession = usePodcastStore.getState().session;
        if (currentSession) {
          setSession({
            ...currentSession,
            hostAgentId: hostResult.agentId,
            guestAgentId: guestResult.agentId,
          });
        }

        setStatus("live");
        showToast("Podcast is live!", "success");
        // Guest hears host greeting via audio → VAD triggers guest's response naturally.
      } catch (err) {
        console.error("[PodcastPage] Start error:", err);
        showToast(
          err instanceof Error ? err.message : "Failed to start podcast",
          "error",
        );
        setStatus("idle");
      }
    },
    [
      podcastRTC, podcastRTM, ambience, buildAgentSettings,
      setHostAgent, setGuestAgent, setSession, setStatus,
    ],
  );

  // Stop podcast
  const handleStop = useCallback(async () => {
    const currentSession = usePodcastStore.getState().session;

    try {
      // Stop both agents
      await fetch("/api/podcast/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSession?.sessionId,
          hostAgentId: currentSession?.hostAgentId,
          guestAgentId: currentSession?.guestAgentId,
        }),
      });
    } catch (err) {
      console.error("[PodcastPage] Stop error:", err);
    }

    // Leave channels
    await podcastRTC.leaveChannel();
    await podcastRTM.leaveRTM();
    ambience.stop();

    setStatus("ended");
  }, [podcastRTC, podcastRTM, ambience, setStatus]);

  // Theme change
  const handleThemeChange = useCallback(
    (theme: PodcastTheme) => {
      const cfg = usePodcastStore.getState().config;
      if (cfg) {
        setConfig({ ...cfg, theme });
        ambience.loadTheme(theme);
      }
    },
    [setConfig, ambience],
  );

  // Lighting change
  const handleLightingChange = useCallback(
    (lighting: LightingPreset) => {
      const cfg = usePodcastStore.getState().config;
      if (cfg) {
        setConfig({ ...cfg, lighting });
      }
    },
    [setConfig],
  );

  // Volume change
  const handleVolumeChange = useCallback(
    (volume: number) => {
      setAmbienceVolume(volume);
      ambience.setVolume(volume);
    },
    [setAmbienceVolume, ambience],
  );

  // Render based on status
  if (status === "idle" || status === "setting-up") {
    return <PodcastSetupScreen onStartPodcast={handleStartPodcast} />;
  }

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 mx-auto mb-4 text-agora-accent-blue"
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
          <p className="text-gray-400 text-lg">Starting your podcast...</p>
          <p className="text-gray-600 text-sm mt-2">
            Setting up AI agents and joining the studio
          </p>
        </div>
      </div>
    );
  }

  if (status === "ended") {
    return <PodcastEndedScreen />;
  }

  // live or wrapping-up
  return (
    <PodcastStudioScreen
      hostVideoTrack={podcastRTC.hostVideoTrack}
      guestVideoTrack={podcastRTC.guestVideoTrack}
      onSendMessage={podcastRTM.sendAudienceMessage}
      onSendQuestion={podcastRTM.sendQuestionToAgent}
      onThemeChange={handleThemeChange}
      onLightingChange={handleLightingChange}
      onVolumeChange={handleVolumeChange}
      onStop={handleStop}
    />
  );
};

export default PodcastPage;
