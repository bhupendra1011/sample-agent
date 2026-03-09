// src/components/podcast/StageArea.tsx
"use client";

import React from "react";
import type { IRemoteVideoTrack } from "agora-rtc-sdk-ng";
import type { PodcastTheme, LightingPreset } from "@/types/podcast";
import { EAgentState } from "@/types/agora";
import AvatarTile from "./AvatarTile";

interface StageAreaProps {
  theme: PodcastTheme;
  lighting: LightingPreset;
  hostName: string;
  guestName: string;
  hostVideoTrack: IRemoteVideoTrack | null;
  guestVideoTrack: IRemoteVideoTrack | null;
  hostAgentState: EAgentState;
  guestAgentState: EAgentState;
  topic: string;
}

const StageArea: React.FC<StageAreaProps> = ({
  theme,
  lighting,
  hostName,
  guestName,
  hostVideoTrack,
  guestVideoTrack,
  hostAgentState,
  guestAgentState,
  topic,
}) => {
  return (
    <div
      className="relative flex-1 flex items-center justify-center gap-8 sm:gap-16 overflow-hidden"
      style={{
        background: theme.cssGradient,
        filter: lighting.cssFilter,
      }}
    >
      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at 30% 50%, ${theme.accentColor}20 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, ${theme.accentColor}15 0%, transparent 60%)`,
          animation: "pulse 4s ease-in-out infinite",
        }}
      />

      {/* Topic display */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-lg text-center">
        <p className="text-white/60 text-sm font-medium px-4 py-1.5 rounded-full bg-black/20 backdrop-blur-sm truncate">
          {topic}
        </p>
      </div>

      {/* Avatars */}
      <AvatarTile
        name={hostName}
        role="host"
        videoTrack={hostVideoTrack}
        agentState={hostAgentState}
        accentColor={theme.accentColor}
      />
      <AvatarTile
        name={guestName}
        role="guest"
        videoTrack={guestVideoTrack}
        agentState={guestAgentState}
        accentColor={theme.accentColor}
      />
    </div>
  );
};

export default StageArea;
