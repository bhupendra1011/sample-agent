// src/screens/podcast/PodcastStudioScreen.tsx
"use client";

import React, { useCallback } from "react";
import usePodcastStore from "@/store/usePodcastStore";
import { EAgentState } from "@/types/agora";
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

  const handleWrapUp = useCallback(async () => {
    if (!session?.hostAgentId || !session?.channel || !config) return;

    try {
      triggerWrapUp();
      setStatus("wrapping-up");

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

      showToast("Wrap-up signal sent to host", "info");
    } catch (err) {
      console.error("[PodcastStudio] Wrap-up error:", err);
      showToast("Failed to trigger wrap-up", "error");
    }
  }, [session, config, triggerWrapUp, setStatus]);

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
