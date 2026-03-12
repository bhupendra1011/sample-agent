// src/screens/podcast/PodcastStudioScreen.tsx
"use client";

import React, { useCallback, useEffect, useRef } from "react";
import usePodcastStore from "@/store/usePodcastStore";
import { EAgentState } from "@/types/agora";
import { ConversationalAIAPI, EChatMessageType } from "@/conversational-ai-api";
import type { IRemoteVideoTrack } from "agora-rtc-sdk-ng";
import type { PodcastTheme, LightingPreset } from "@/types/podcast";
import { showToast } from "@/services/uiService";
import PodcastTimerBar from "@/components/podcast/PodcastTimerBar";
import StageArea from "@/components/podcast/StageArea";
import PodcastTranscriptPanel from "@/components/podcast/PodcastTranscriptPanel";
import AudienceChatPanel from "@/components/podcast/AudienceChatPanel";
import PodcastControls from "@/components/podcast/PodcastControls";
import { usePodcastTimer } from "@/hooks/podcast/usePodcastTimer";
import { buildHostSystemPrompt } from "@/config/podcast/prompts";

interface PodcastStudioScreenProps {
  hostVideoTrack: IRemoteVideoTrack | null;
  guestVideoTrack: IRemoteVideoTrack | null;
  onSendMessage: (text: string, displayName: string) => Promise<void>;
  onSendQuestion: (question: string) => Promise<void>;
  onThemeChange: (theme: PodcastTheme) => void;
  onLightingChange: (lighting: LightingPreset) => void;
  onVolumeChange: (volume: number) => void;
  onStop: () => void;
}

const PodcastStudioScreen: React.FC<PodcastStudioScreenProps> = ({
  hostVideoTrack,
  guestVideoTrack,
  onSendMessage,
  onSendQuestion,
  onThemeChange,
  onLightingChange,
  onVolumeChange,
  onStop,
}) => {
  const config = usePodcastStore((s) => s.config);
  const session = usePodcastStore((s) => s.session);
  const hostAgent = usePodcastStore((s) => s.hostAgent);
  const guestAgent = usePodcastStore((s) => s.guestAgent);
  const setStatus = usePodcastStore((s) => s.setStatus);
  const triggerWrapUp = usePodcastStore((s) => s.triggerWrapUp);

  const wrapUpTriggered = usePodcastStore((s) => s.wrapUpTriggered);
  const wrapUpSpokenRef = useRef(false);
  const wrapUpFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWrapUp = useCallback(async () => {
    if (!session?.hostAgentId || !session?.channel || !config) return;

    try {
      triggerWrapUp();
      setStatus("wrapping-up");

      // Step 1: Update system prompt (belt-and-suspenders fallback)
      const systemMessages = [
        {
          role: "system",
          content: buildHostSystemPrompt(config.topic, config.hostAvatar.name, config.guestAvatar.name),
        },
      ];

      await fetch("/api/podcast/wrap-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          hostAgentId: session.hostAgentId,
          channelName: session.channel,
          currentSystemMessages: systemMessages,
        }),
      });

      // Step 2: Directly tell the host to wrap up via chat()
      try {
        const api = ConversationalAIAPI.getInstance();
        await api.chat(String(session.hostRtcUid), {
          messageType: EChatMessageType.TEXT,
          text: `[WRAP UP NOW] Wrap up in 2-3 short sentences. Thank ${config.guestAvatar.name}, mention one takeaway, and say goodbye to the audience. Keep it brief.`,
        });
      } catch (chatErr) {
        console.error("[PodcastStudio] Wrap-up chat() error:", chatErr);
      }

      // Step 3: Fallback auto-stop after 45 seconds
      wrapUpFallbackRef.current = setTimeout(() => {
        const currentStatus = usePodcastStore.getState().status;
        if (currentStatus === "wrapping-up") {
          console.log("[PodcastStudio] Wrap-up fallback timer fired, stopping");
          onStop();
        }
      }, 45000);

      showToast("Wrap-up signal sent to host", "info");
    } catch (err) {
      console.error("[PodcastStudio] Wrap-up error:", err);
      showToast("Failed to trigger wrap-up", "error");
    }
  }, [session, config, triggerWrapUp, setStatus, onStop]);

  // State-based auto-stop: when host finishes speaking after wrap-up
  useEffect(() => {
    if (!wrapUpTriggered) return;

    const state = hostAgent?.state;
    if (state === EAgentState.SPEAKING) {
      wrapUpSpokenRef.current = true;
    }

    // After host has spoken, any non-speaking state means closing remarks are done
    if (wrapUpSpokenRef.current && state && state !== EAgentState.SPEAKING) {
      const t = setTimeout(() => {
        if (wrapUpFallbackRef.current) {
          clearTimeout(wrapUpFallbackRef.current);
          wrapUpFallbackRef.current = null;
        }
        console.log("[PodcastStudio] Host finished wrap-up speech, auto-stopping");
        onStop();
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [wrapUpTriggered, hostAgent?.state, onStop]);

  const timer = usePodcastTimer({
    onWrapUp: handleWrapUp,
    onStop,
  });

  if (!config) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Timer Bar */}
      <PodcastTimerBar
        formattedElapsed={timer.formattedElapsed}
        formattedDuration={timer.formattedDuration}
        phase={timer.phase}
      />

      {/* Main content: Stage + side panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Stage (center) */}
        <div className="flex-1 flex flex-col">
          <StageArea
            theme={config.theme}
            lighting={config.lighting}
            hostName={config.hostAvatar.name}
            guestName={config.guestAvatar.name}
            hostVideoTrack={hostVideoTrack}
            guestVideoTrack={guestVideoTrack}
            hostAgentState={hostAgent?.state ?? EAgentState.IDLE}
            guestAgentState={guestAgent?.state ?? EAgentState.IDLE}
            topic={config.topic}
          />
        </div>

        {/* Right side panels: Transcript + Chat */}
        <div className="w-80 lg:w-96 flex flex-col bg-gray-900/80 border-l border-white/10">
          {/* Transcript (top half) */}
          <div className="flex-1 border-b border-white/10 overflow-hidden">
            <PodcastTranscriptPanel />
          </div>

          {/* Audience Chat (bottom half) */}
          <div className="flex-1 overflow-hidden">
            <AudienceChatPanel
              onSendMessage={onSendMessage}
              onSendQuestion={onSendQuestion}
            />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <PodcastControls
        onThemeChange={onThemeChange}
        onLightingChange={onLightingChange}
        onVolumeChange={onVolumeChange}
        onWrapUp={handleWrapUp}
        onStop={onStop}
      />
    </div>
  );
};

export default PodcastStudioScreen;
