// src/components/podcast/PodcastAvatarPickerTile.tsx
"use client";

import React from "react";
import type { PodcastAvatarConfig } from "@/types/podcast";

interface PodcastAvatarPickerTileProps {
  avatar: PodcastAvatarConfig;
  selected: boolean;
  onSelect: () => void;
}

const PodcastAvatarPickerTile: React.FC<PodcastAvatarPickerTileProps> = ({
  avatar,
  selected,
  onSelect,
}) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className="group relative block w-full cursor-pointer p-0 text-left focus:outline-none"
  >
    {/* Outer wrapper — ring lives here so it doesn't clip the image */}
    <div
      className={`relative overflow-hidden rounded-xl transition-all duration-200 ${
        selected
          ? "ring-2 ring-[var(--agora-accent-blue)] ring-offset-2 ring-offset-gray-950 shadow-lg shadow-[var(--agora-accent-blue)]/15 scale-[1.03]"
          : "ring-1 ring-white/[0.06] hover:ring-white/[0.15] hover:scale-[1.02]"
      }`}
    >
      {/* Image — uses padding-bottom trick for reliable aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: "133%" }}>
        <img
          src={avatar.imageUrl}
          alt={avatar.name}
          loading="eager"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Bottom gradient + name */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 pb-2 pt-8">
        <span className="block truncate text-center text-xs font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {avatar.name}
        </span>
      </div>

      {/* Selection check badge */}
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--agora-accent-blue)] shadow-md">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </div>
  </button>
);

export default PodcastAvatarPickerTile;
