// src/components/ParticipantListItem.tsx
import React from "react";
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff } from "react-icons/md";
import type { Participant } from "../types/agora";

interface ParticipantListItemProps extends Participant {
  isLocal?: boolean;
}

const ParticipantListItem: React.FC<ParticipantListItemProps> = ({
  name,
  micMuted,
  videoMuted,
  isLocal,
}) => {
  return (
    // UPDATED: Using direct Tailwind default colors for text
    <div className="flex items-center mb-3 text-gray-900 dark:text-white text-base">
      <span className="font-medium mr-2">
        {isLocal ? "You:" : ""} {name}
      </span>
      <span className="flex items-center space-x-1">
        {/* UPDATED: Using direct Tailwind default colors for icons */}
        {micMuted ? (
          <MdMicOff
            size={20}
            className="text-red-500 dark:text-red-400"
            title="Mic Muted"
          />
        ) : (
          <MdMic
            size={20}
            className="text-green-500 dark:text-green-400"
            title="Mic On"
          />
        )}
        {videoMuted ? (
          <MdVideocamOff
            size={20}
            className="text-red-500 dark:text-red-400"
            title="Video Off"
          />
        ) : (
          <MdVideocam
            size={20}
            className="text-green-500 dark:text-green-400"
            title="Video On"
          />
        )}
      </span>
    </div>
  );
};

export default ParticipantListItem;
