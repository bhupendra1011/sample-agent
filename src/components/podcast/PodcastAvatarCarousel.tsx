// src/components/podcast/PodcastAvatarCarousel.tsx
"use client";

import React from "react";
import type { PodcastAvatarConfig } from "@/types/podcast";
import PodcastAvatarPickerTile from "@/components/podcast/PodcastAvatarPickerTile";

interface PodcastAvatarCarouselProps {
  avatars: PodcastAvatarConfig[];
  selected: PodcastAvatarConfig;
  onSelect: (avatar: PodcastAvatarConfig) => void;
}

const PodcastAvatarCarousel: React.FC<PodcastAvatarCarouselProps> = ({
  avatars,
  selected,
  onSelect,
}) => (
  <div
    className="grid gap-2"
    style={{ gridTemplateColumns: `repeat(${avatars.length}, minmax(0, 1fr))` }}
  >
    {avatars.map((avatar) => (
      <PodcastAvatarPickerTile
        key={avatar.id}
        avatar={avatar}
        selected={selected.id === avatar.id}
        onSelect={() => onSelect(avatar)}
      />
    ))}
  </div>
);

export default PodcastAvatarCarousel;
