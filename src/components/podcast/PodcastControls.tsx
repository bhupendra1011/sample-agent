// src/components/podcast/PodcastControls.tsx
"use client";

import React, { useState, useCallback } from "react";
import usePodcastStore from "@/store/usePodcastStore";
import { PODCAST_THEMES, LIGHTING_PRESETS } from "@/config/podcast/themes";
import type { PodcastTheme, LightingPreset } from "@/types/podcast";
import Modal from "@/components/common/Modal";

interface PodcastControlsProps {
  onThemeChange: (theme: PodcastTheme) => void;
  onLightingChange: (lighting: LightingPreset) => void;
  onVolumeChange: (volume: number) => void;
  onWrapUp: () => void;
  onStop: () => void;
}

const PodcastControls: React.FC<PodcastControlsProps> = ({
  onThemeChange,
  onLightingChange,
  onVolumeChange,
  onWrapUp,
  onStop,
}) => {
  const config = usePodcastStore((s) => s.config);
  const status = usePodcastStore((s) => s.status);
  const ambienceVolume = usePodcastStore((s) => s.ambienceVolume);
  const wrapUpTriggered = usePodcastStore((s) => s.wrapUpTriggered);
  const [showStopModal, setShowStopModal] = useState(false);

  const handleStop = useCallback(() => {
    setShowStopModal(false);
    onStop();
  }, [onStop]);

  if (!config) return null;

  return (
    <>
      <div className="flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md border-t border-white/10">
        {/* Left: Theme + Lighting */}
        <div className="flex items-center gap-4">
          {/* Theme selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Theme</span>
            <select
              value={config.theme.id}
              onChange={(e) => {
                const theme = PODCAST_THEMES.find((t) => t.id === e.target.value);
                if (theme) onThemeChange(theme);
              }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
            >
              {PODCAST_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lighting selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Lighting</span>
            <select
              value={config.lighting.id}
              onChange={(e) => {
                const lighting = LIGHTING_PRESETS.find((l) => l.id === e.target.value);
                if (lighting) onLightingChange(lighting);
              }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
            >
              {LIGHTING_PRESETS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Ambience</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(ambienceVolume * 100)}
              onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
              className="w-20 h-1 accent-purple-500"
            />
          </div>
        </div>

        {/* Right: Wrap Up + Stop */}
        <div className="flex items-center gap-3">
          {!wrapUpTriggered && status === "live" && (
            <button
              onClick={onWrapUp}
              className="px-4 py-2 rounded-lg bg-yellow-600/20 border border-yellow-500/40 text-yellow-400 text-sm font-medium hover:bg-yellow-600/30 transition-colors"
            >
              Wrap Up
            </button>
          )}

          <button
            onClick={() => setShowStopModal(true)}
            className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-600/30 transition-colors"
          >
            Stop Podcast
          </button>
        </div>
      </div>

      {/* Stop confirmation modal */}
      <Modal
        isOpen={showStopModal}
        onClose={() => setShowStopModal(false)}
        title="Stop Podcast?"
      >
        <p className="mb-6">
          This will end the podcast and stop both AI agents. The transcript will
          be saved.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setShowStopModal(false)}
            className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStop}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
          >
            Stop
          </button>
        </div>
      </Modal>
    </>
  );
};

export default PodcastControls;
