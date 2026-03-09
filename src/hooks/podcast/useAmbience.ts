// src/hooks/podcast/useAmbience.ts
"use client";

import { useRef, useCallback, useEffect } from "react";
import type { PodcastTheme } from "@/types/podcast";

export const useAmbience = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gainRef = useRef(0.3);
  const duckedRef = useRef(false);

  const loadTheme = useCallback(async (theme: PodcastTheme) => {
    // Crossfade: fade out current, start new
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (!theme.ambienceAudio) return;

    try {
      const audio = new Audio(theme.ambienceAudio);
      audio.loop = true;
      audio.volume = gainRef.current;
      await audio.play();
      audioRef.current = audio;
    } catch {
      // Audio file not found or playback blocked — silently skip for MVP
      console.log("[Ambience] Audio not available for theme:", theme.name);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    gainRef.current = v;
    if (audioRef.current && !duckedRef.current) {
      audioRef.current.volume = v;
    }
  }, []);

  const duck = useCallback(() => {
    duckedRef.current = true;
    if (audioRef.current) {
      audioRef.current.volume = Math.min(gainRef.current * 0.3, 0.05);
    }
  }, []);

  const unduck = useCallback(() => {
    duckedRef.current = false;
    if (audioRef.current) {
      audioRef.current.volume = gainRef.current;
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return { loadTheme, setVolume, duck, unduck, stop };
};
