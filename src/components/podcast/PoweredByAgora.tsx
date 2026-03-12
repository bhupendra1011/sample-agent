// src/components/podcast/PoweredByAgora.tsx
"use client";

import React from "react";

interface PoweredByAgoraProps {
  variant?: "default" | "compact";
  className?: string;
}

const LOGO_PATH = "/podcast/agora-logo.svg";

const PoweredByAgora: React.FC<PoweredByAgoraProps> = ({
  variant = "default",
  className = "",
}) => {
  const size = variant === "compact" ? 20 : 24;

  return (
    <div
      className={`inline-flex items-center gap-2 text-gray-500 ${className}`}
      role="img"
      aria-label="Powered by Agora"
    >
      <span className="text-xs font-medium text-gray-500">Powered by</span>
      <img
        src={LOGO_PATH}
        alt=""
        width={size}
        height={size}
        className="shrink-0 opacity-90"
      />
      <span
        className="text-sm font-bold tracking-tight"
        style={{ color: "var(--agora-accent-blue, #00c2ff)" }}
      >
        Agora
      </span>
    </div>
  );
};

export default PoweredByAgora;
