"use client";

import { useState, useCallback, useEffect } from "react";
import useAppStore from "@/store/useAppStore";
import { TOUR_STEPS } from "@/components/FeatureTour/tourSteps";
import type { TourStep } from "@/components/FeatureTour/tourSteps";

const TOUR_SEEN_KEY = "agora_tour_seen_v1";

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface UseTourReturn {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  activeStep: TourStep;
  spotlightRect: SpotlightRect | null;
  startTour: () => void;
  closeTour: () => void;
  goNext: () => void;
  goPrev: () => void;
}

export function useTour(): UseTourReturn {
  const isHost = useAppStore((state) => state.isHost);

  const visibleSteps: TourStep[] = TOUR_STEPS.filter(
    (step) => !step.hostOnly || isHost,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(
    null,
  );

  const measureTarget = useCallback((stepId: string) => {
    const el = document.querySelector(`[data-tour="${stepId}"]`);
    if (!el) {
      setSpotlightRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setSpotlightRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  // Re-measure on window resize
  useEffect(() => {
    if (!isOpen) return;
    const step = visibleSteps[currentStep];
    if (!step || step.isCentered) return;

    const handleResize = () => measureTarget(step.id);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, currentStep, visibleSteps, measureTarget]);

  // Measure whenever step changes
  useEffect(() => {
    if (!isOpen) return;
    const step = visibleSteps[currentStep];
    if (!step) return;
    if (step.isCentered) {
      setSpotlightRect(null);
      return;
    }
    const timer = setTimeout(() => measureTarget(step.id), 80);
    return () => clearTimeout(timer);
  }, [isOpen, currentStep, visibleSteps, measureTarget]);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "true");
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    setSpotlightRect(null);
    markSeen();
  }, [markSeen]);

  // Auto-start on first visit
  useEffect(() => {
    let hasSeen = false;
    try {
      hasSeen = localStorage.getItem(TOUR_SEEN_KEY) === "true";
    } catch {
      // ignore
    }
    if (!hasSeen) {
      const timer = setTimeout(() => setIsOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= visibleSteps.length) {
        setIsOpen(false);
        setSpotlightRect(null);
        markSeen();
        return prev;
      }
      return next;
    });
  }, [visibleSteps.length, markSeen]);

  const goPrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    isOpen,
    currentStep,
    totalSteps: visibleSteps.length,
    activeStep: visibleSteps[currentStep] ?? visibleSteps[0],
    spotlightRect,
    startTour,
    closeTour,
    goNext,
    goPrev,
  };
}
