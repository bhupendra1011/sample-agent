// src/components/podcast/AvatarTile.tsx
"use client";

import React, { useRef, useEffect } from "react";
import type { IRemoteVideoTrack } from "agora-rtc-sdk-ng";
import { EAgentState } from "@/types/agora";

interface AvatarTileProps {
  name: string;
  role: "host" | "guest";
  videoTrack: IRemoteVideoTrack | null;
  agentState: EAgentState;
  accentColor: string;
}

const stateLabels: Record<EAgentState, string> = {
  [EAgentState.IDLE]: "Idle",
  [EAgentState.LISTENING]: "Listening",
  [EAgentState.THINKING]: "Thinking",
  [EAgentState.SPEAKING]: "Speaking",
  [EAgentState.SILENT]: "Silent",
};

const AvatarTile: React.FC<AvatarTileProps> = ({
  name,
  role,
  videoTrack,
  agentState,
  accentColor,
}) => {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = videoRef.current;
    if (!container || !videoTrack) return;

    videoTrack.play(container);

    // Force object-fit: contain so avatar isn't cropped
    const setContain = (el: Element) => {
      (el as HTMLVideoElement).style.objectFit = "contain";
    };
    const video = container.querySelector("video");
    if (video) setContain(video);

    // Agora may inject <video> async; observe so we override object-fit when it appears
    const observer = new MutationObserver(() => {
      const v = container.querySelector("video");
      if (v) setContain(v);
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      videoTrack.stop();
    };
  }, [videoTrack]);

  const isSpeaking = agentState === EAgentState.SPEAKING;
  const gradientColors =
    role === "host"
      ? "from-purple-500 to-indigo-600"
      : "from-pink-500 to-rose-600";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar container */}
      <div
        className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden transition-all duration-300 ${
          isSpeaking ? "ring-4 ring-offset-2 ring-offset-transparent" : ""
        }`}
        style={isSpeaking ? { boxShadow: `0 0 30px ${accentColor}40, 0 0 0 4px ${accentColor}` } : {}}
      >
        {videoTrack ? (
          <div
            ref={videoRef}
            className="w-full h-full bg-black [&_video]:!object-contain [&_video]:!w-full [&_video]:!h-full"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradientColors} flex items-center justify-center`}
          >
            <span className="text-5xl font-bold text-white/90">{name[0]}</span>
          </div>
        )}

        {/* Speaking pulse ring */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ boxShadow: `inset 0 0 20px ${accentColor}30` }} />
        )}
      </div>

      {/* Name + Role */}
      <div className="text-center">
        <span className="block text-white font-semibold text-lg">{name}</span>
        <span className="block text-xs text-gray-400 uppercase tracking-wider">
          {role}
        </span>
      </div>

      {/* Agent state badge */}
      <span
        className={`text-xs px-2.5 py-1 rounded-full ${
          agentState === EAgentState.SPEAKING
            ? "bg-green-500/20 text-green-400"
            : agentState === EAgentState.THINKING
            ? "bg-yellow-500/20 text-yellow-400"
            : agentState === EAgentState.LISTENING
            ? "bg-blue-500/20 text-blue-400"
            : "bg-gray-500/20 text-gray-400"
        }`}
      >
        {stateLabels[agentState]}
      </span>
    </div>
  );
};

export default AvatarTile;
