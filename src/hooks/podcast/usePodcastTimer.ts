// src/hooks/podcast/usePodcastTimer.ts
"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import usePodcastStore from "@/store/usePodcastStore";

interface UsePodcastTimerOptions {
  onWrapUp: () => void;
  onStop: () => void;
}

export const usePodcastTimer = (options: UsePodcastTimerOptions) => {
  const { onWrapUp, onStop } = options;

  const status = usePodcastStore((s) => s.status);
  const timer = usePodcastStore((s) => s.timer);
  const wrapUpTriggered = usePodcastStore((s) => s.wrapUpTriggered);
  const tickTimer = usePodcastStore((s) => s.tickTimer);
  const triggerWrapUp = usePodcastStore((s) => s.triggerWrapUp);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wrapUpCalledRef = useRef(false);
  const stopCalledRef = useRef(false);

  useEffect(() => {
    if (status === "live" || status === "wrapping-up") {
      intervalRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, tickTimer]);

  // Auto wrap-up at 80% duration
  useEffect(() => {
    if (
      timer.duration > 0 &&
      timer.elapsed >= timer.duration * 0.8 &&
      !wrapUpTriggered &&
      !wrapUpCalledRef.current &&
      (status === "live")
    ) {
      wrapUpCalledRef.current = true;
      triggerWrapUp();
      onWrapUp();
    }
  }, [timer.elapsed, timer.duration, wrapUpTriggered, status, triggerWrapUp, onWrapUp]);

  // Auto-stop at 100% duration + 60s buffer
  useEffect(() => {
    if (
      timer.duration > 0 &&
      timer.elapsed >= timer.duration + 60 &&
      !stopCalledRef.current &&
      (status === "live" || status === "wrapping-up")
    ) {
      stopCalledRef.current = true;
      onStop();
    }
  }, [timer.elapsed, timer.duration, status, onStop]);

  // Reset refs when podcast resets
  useEffect(() => {
    if (status === "idle") {
      wrapUpCalledRef.current = false;
      stopCalledRef.current = false;
    }
  }, [status]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const formattedElapsed = useMemo(() => formatTime(timer.elapsed), [timer.elapsed, formatTime]);
  const formattedRemaining = useMemo(() => formatTime(timer.remaining), [timer.remaining, formatTime]);
  const formattedDuration = useMemo(() => formatTime(timer.duration), [timer.duration, formatTime]);

  return {
    formattedElapsed,
    formattedRemaining,
    formattedDuration,
    phase: timer.phase,
    elapsed: timer.elapsed,
    duration: timer.duration,
    remaining: timer.remaining,
  };
};
