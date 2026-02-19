"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { MdClose, MdArrowBack, MdArrowForward, MdCheck } from "react-icons/md";
import type { TourStep, TourStepPlacement } from "./tourSteps";
import type { SpotlightRect } from "@/hooks/useTour";

interface TourTooltipCardProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  spotlightRect: SpotlightRect | null;
  padding: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const CARD_WIDTH = 300;
const CARD_OFFSET = 18;

function computePosition(
  spotlightRect: SpotlightRect | null,
  placement: TourStepPlacement,
  padding: number,
  cardHeight: number,
): React.CSSProperties {
  if (!spotlightRect || placement === "center") {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: CARD_WIDTH,
      maxWidth: "calc(100vw - 32px)",
    };
  }

  const { top, left, width, height } = spotlightRect;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cutoutBottom = top + height + padding;
  const cutoutTop = top - padding;
  const cutoutRight = left + width + padding;
  const cutoutLeft = left - padding;
  const spotCenterX = left + width / 2;
  const spotCenterY = top + height / 2;

  const clampX = (x: number) =>
    Math.max(16, Math.min(vw - CARD_WIDTH - 16, x - CARD_WIDTH / 2));

  switch (placement) {
    case "top":
      return {
        position: "fixed",
        bottom: vh - cutoutTop + CARD_OFFSET,
        left: clampX(spotCenterX),
        width: CARD_WIDTH,
        maxWidth: "calc(100vw - 32px)",
      };
    case "bottom":
      return {
        position: "fixed",
        top: cutoutBottom + CARD_OFFSET,
        left: clampX(spotCenterX),
        width: CARD_WIDTH,
        maxWidth: "calc(100vw - 32px)",
      };
    case "left":
      return {
        position: "fixed",
        top: Math.max(16, spotCenterY - cardHeight / 2),
        right: vw - cutoutLeft + CARD_OFFSET,
        width: CARD_WIDTH,
        maxWidth: "calc(100vw - 32px)",
      };
    case "right":
      return {
        position: "fixed",
        top: Math.max(16, spotCenterY - cardHeight / 2),
        left: cutoutRight + CARD_OFFSET,
        width: CARD_WIDTH,
        maxWidth: "calc(100vw - 32px)",
      };
    default:
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: CARD_WIDTH,
        maxWidth: "calc(100vw - 32px)",
      };
  }
}

const TourTooltipCard: React.FC<TourTooltipCardProps> = ({
  step,
  currentStep,
  totalSteps,
  spotlightRect,
  padding,
  onClose,
  onNext,
  onPrev,
  isFirst,
  isLast,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(180);

  useLayoutEffect(() => {
    if (cardRef.current) {
      setCardHeight(cardRef.current.offsetHeight);
    }
  }, [step.id]);

  const style = computePosition(spotlightRect, step.placement, padding, cardHeight);

  return (
    <div
      ref={cardRef}
      style={{ ...style, zIndex: 101 }}
      className="absolute pointer-events-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl shadow-black/40 p-4 animate-fade-in-up"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <h3 className="font-syne font-bold text-sm text-gray-900 dark:text-white leading-snug">
          {step.title}
        </h3>
        <button
          onClick={onClose}
          className="shrink-0 p-0.5 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
          aria-label="Skip tour"
        >
          <MdClose size={16} />
        </button>
      </div>

      {/* Step indicator dots */}
      <div className="flex items-center gap-1 mb-2.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === currentStep
                ? "w-4 h-1 bg-[var(--agora-accent-blue)]"
                : i < currentStep
                  ? "w-1 h-1 bg-[var(--agora-accent-blue)] opacity-50"
                  : "w-1 h-1 bg-gray-300 dark:bg-gray-600"
            }`}
          />
        ))}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
        {step.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tabular-nums">
          {currentStep + 1} / {totalSteps}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none mr-0.5"
          >
            Skip
          </button>

          {!isFirst && (
            <button
              onClick={onPrev}
              className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none"
              aria-label="Previous step"
            >
              <MdArrowBack size={14} />
            </button>
          )}

          <button
            onClick={onNext}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--agora-accent-blue)] text-white hover:opacity-90 transition-opacity focus:outline-none"
            aria-label={isLast ? "Finish tour" : "Next step"}
          >
            {isLast ? <MdCheck size={14} /> : <MdArrowForward size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourTooltipCard;
