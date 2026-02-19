"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import type { UseTourReturn } from "@/hooks/useTour";
import TourTooltipCard from "./TourTooltipCard";

const PADDING = 10;

const TourOverlay: React.FC<UseTourReturn> = ({
  isOpen,
  currentStep,
  totalSteps,
  activeStep,
  spotlightRect,
  startTour,
  closeTour,
  goNext,
  goPrev,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTour();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeTour]);

  if (!isOpen) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const isCentered = activeStep.isCentered || !spotlightRect;

  const cutout = spotlightRect
    ? {
        x: spotlightRect.left - PADDING,
        y: spotlightRect.top - PADDING,
        width: spotlightRect.width + PADDING * 2,
        height: spotlightRect.height + PADDING * 2,
      }
    : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={`Feature tour step ${currentStep + 1} of ${totalSteps}: ${activeStep.title}`}
    >
      {/* SVG backdrop with spotlight cutout */}
      {!isCentered && cutout ? (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={cutout.x}
                y={cutout.y}
                width={cutout.width}
                height={cutout.height}
                rx="8"
                ry="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.75)"
            mask="url(#tour-spotlight-mask)"
          />
          {/* Accent glow ring */}
          <rect
            x={cutout.x - 1}
            y={cutout.y - 1}
            width={cutout.width + 2}
            height={cutout.height + 2}
            rx="9"
            ry="9"
            fill="none"
            stroke="#00c2ff"
            strokeWidth="2"
            opacity="0.8"
            className="animate-[tour-glow_1.8s_ease-in-out_infinite]"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-black/75" />
      )}

      {/* Clickable backdrop to dismiss */}
      <div
        className="absolute inset-0"
        onClick={closeTour}
        aria-hidden="true"
      />

      {/* Tooltip Card */}
      <TourTooltipCard
        step={activeStep}
        currentStep={currentStep}
        totalSteps={totalSteps}
        spotlightRect={spotlightRect}
        padding={PADDING}
        onClose={closeTour}
        onNext={goNext}
        onPrev={goPrev}
        isFirst={isFirst}
        isLast={isLast}
      />
    </div>,
    document.body,
  );
};

export default TourOverlay;
