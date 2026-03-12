// src/components/podcast/StageArea.tsx
"use client";

import React from "react";
import type { IRemoteVideoTrack } from "agora-rtc-sdk-ng";
import type { PodcastTheme, LightingPreset } from "@/types/podcast";
import { EAgentState } from "@/types/agora";
import usePodcastStore from "@/store/usePodcastStore";
import AvatarTile from "./AvatarTile";
import PendantLight from "./PendantLight";

interface StageAreaProps {
  theme: PodcastTheme;
  lighting: LightingPreset;
  hostName: string;
  guestName: string;
  hostVideoTrack: IRemoteVideoTrack | null;
  guestVideoTrack: IRemoteVideoTrack | null;
  hostAgentState: EAgentState;
  guestAgentState: EAgentState;
}

const PENDANT_COUNT = 3;

const StageArea: React.FC<StageAreaProps> = ({
  theme,
  lighting,
  hostName,
  guestName,
  hostVideoTrack,
  guestVideoTrack,
  hostAgentState,
  guestAgentState,
}) => {
  const studioLightLevel = usePodcastStore((s) => s.studioLightLevel);
  const overlayOpacity = 1 - studioLightLevel / 100;

  return (
    <div
      className="relative flex-1 flex flex-col items-center justify-center gap-8 sm:gap-16 overflow-hidden"
      style={{
        background: theme.cssGradient,
        filter: lighting.cssFilter,
      }}
    >
      {/* Background image: low z-index so text stays on top and prominent */}
      {theme.backgroundImage && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${theme.backgroundImage})`,
            opacity: 0.25 + (studioLightLevel / 100) * 0.25,
          }}
        />
      )}
      {/* Studio lighting: darker overlay when slider is low */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-black"
        style={{ opacity: overlayOpacity * 0.35 }}
        aria-hidden
      />

      {/* Subtle gradient overlay — behind content */}
      <div
        className="absolute inset-0 z-[1] opacity-20"
        style={{
          background: `radial-gradient(ellipse at 30% 50%, ${theme.accentColor}30 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, ${theme.accentColor}20 0%, transparent 60%)`,
        }}
      />

      {/* Hanging lights: 3 prominent pendants, glow = theme accent (not fixed blue) */}
      <div className="absolute top-0 left-0 right-0 flex justify-center gap-12 sm:gap-16 pt-2 pb-6 pointer-events-none z-10">
        {Array.from({ length: PENDANT_COUNT }, (_, i) => (
          <PendantLight
            key={i}
            glowColor={theme.accentColor}
            intensity={studioLightLevel}
            prominent
          />
        ))}
      </div>

      {/* Avatars + labels: high z-index so always on top of bg (topic is in top bar) */}
      <div className="relative z-20 flex items-center justify-center gap-8 sm:gap-16">
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
    </div>
  );
};

export default StageArea;
