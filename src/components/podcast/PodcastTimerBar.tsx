// src/components/podcast/PodcastTimerBar.tsx
"use client";

import React from "react";
import usePodcastStore from "@/store/usePodcastStore";

interface PodcastTimerBarProps {
  formattedElapsed: string;
  formattedDuration: string;
  phase: string;
}

const PodcastTimerBar: React.FC<PodcastTimerBarProps> = ({
  formattedElapsed,
  formattedDuration,
  phase: _phase,
}) => {
  const config = usePodcastStore((s) => s.config);
  const status = usePodcastStore((s) => s.status);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md border-b border-white/10 gap-4">
      {/* Left: Title + Topic (podcast title in top bar) + Timer */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <h2 className="text-lg font-bold text-white font-syne tracking-tight shrink-0">
          Convo AI Podcast
        </h2>
        {config?.topic && (
          <span className="text-sm text-gray-300 truncate max-w-[280px] sm:max-w-md" title={config.topic}>
            {config.topic}
          </span>
        )}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <span className="font-mono text-lg text-white">
            {formattedElapsed}
          </span>
          <span className="text-gray-500">/</span>
          <span className="font-mono text-lg text-gray-400">
            {formattedDuration}
          </span>
        </div>
      </div>

      {/* Right: Theme name, LIVE at far right */}
      <div className="flex items-center gap-4 justify-end shrink-0">
        {config && (
          <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 text-sm">
            {config.theme.name}
          </span>
        )}
        {(status === "live" || status === "wrapping-up") && (
          <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold text-red-400 uppercase tracking-wider">
              {status === "wrapping-up" ? "Wrapping Up" : "Live"}
            </span>
          </span>
        )}
      </div>
    </header>
  );
};

export default PodcastTimerBar;
