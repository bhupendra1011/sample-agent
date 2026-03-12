// src/components/podcast/PendantLight.tsx
"use client";

import React from "react";

interface PendantLightProps {
  /** Glow color (theme accent — use theme.accentColor, not fixed blue) */
  glowColor: string;
  /** 0–100: intensity of the light glow */
  intensity?: number;
  /** Larger, more prominent fixture */
  prominent?: boolean;
  className?: string;
}

/**
 * Single clean pendant lamp: ceiling canopy, cord, inverted bell shade (black exterior, white interior).
 * Glow uses theme accent color so each theme shows its own light color.
 */
const PendantLight: React.FC<PendantLightProps> = ({
  glowColor,
  intensity = 70,
  prominent = false,
  className = "",
}) => {
  const opacity = 0.3 + (intensity / 100) * 0.6;
  const glowOpacity = (intensity / 100) * 0.9;
  const size = prominent ? 44 : 32;
  const height = prominent ? 66 : 48;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={height}
        viewBox="0 0 32 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        {/* Ceiling canopy */}
        <circle cx="16" cy="4" r="3" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />
        {/* Cord */}
        <line x1="16" y1="7" x2="16" y2="18" stroke="#1a1a1a" strokeWidth="1.5" />
        {/* Transition cone into shade */}
        <path
          d="M14 18 L16 22 L18 18 Z"
          fill="#1a1a1a"
          stroke="#333"
          strokeWidth="0.5"
        />
        {/* Inverted bell shade: black exterior */}
        <path
          d="M10 22 Q6 28 8 38 Q16 44 24 38 Q26 28 22 22 Z"
          fill="#1a1a1a"
          stroke="#333"
          strokeWidth="0.5"
        />
        {/* White interior (visible from below) */}
        <ellipse cx="16" cy="36" rx="6" ry="2.5" fill="rgba(255,255,255,0.95)" />
        <path
          d="M12 24 Q16 32 20 24"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Inner glow (bulb) - colored by theme */}
        <ellipse
          cx="16"
          cy="34"
          rx="4"
          ry="2"
          fill={glowColor}
          fillOpacity={glowOpacity}
          style={{
            filter: `blur(4px) drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
      </svg>
      {/* Soft glow beneath the fixture */}
      <div
        className={`rounded-full -mt-1 ${prominent ? "w-14 h-7" : "w-10 h-5"}`}
        style={{
          background: `radial-gradient(ellipse 80% 50% at center, ${glowColor} 0%, transparent 70%)`,
          opacity,
          filter: "blur(6px)",
        }}
      />
    </div>
  );
};

export default PendantLight;
