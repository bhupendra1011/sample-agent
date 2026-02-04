// src/components/ParticipantListItem.tsx
import React from "react";
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff } from "react-icons/md";
import type { Participant } from "../types/agora";

interface ParticipantListItemProps extends Participant {
  uid?: string;
  isLocal?: boolean;
  isHost?: boolean;
  onMuteAudio?: (uid: string) => void;
  onMuteVideo?: (uid: string) => void;
  onUnmuteAudio?: (uid: string) => void;
  onUnmuteVideo?: (uid: string) => void;
}

const ParticipantListItem: React.FC<ParticipantListItemProps> = ({
  uid,
  name,
  micMuted,
  videoMuted,
  isLocal,
  isHost,
  onMuteAudio,
  onMuteVideo,
  onUnmuteAudio,
  onUnmuteVideo,
}) => {
  // Host can control remote participants
  const showHostControls = isHost && !isLocal && uid;

  return (
    <div className="flex items-center justify-between mb-3 text-gray-900 dark:text-white text-base">
      <div className="flex items-center">
        <span className="font-medium mr-2">
          {isLocal ? "You:" : ""} {name}
        </span>
        <span className="flex items-center space-x-1">
          {/* Audio icon - clickable for hosts on remote participants */}
          {showHostControls ? (
            <button
              onClick={() =>
                micMuted ? onUnmuteAudio?.(uid) : onMuteAudio?.(uid)
              }
              className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title={micMuted ? "Request unmute audio" : "Mute audio"}
            >
              {micMuted ? (
                <MdMicOff
                  size={20}
                  className="text-red-500 dark:text-red-400"
                />
              ) : (
                <MdMic
                  size={20}
                  className="text-green-500 dark:text-green-400"
                />
              )}
            </button>
          ) : micMuted ? (
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

          {/* Video icon - clickable for hosts on remote participants */}
          {showHostControls ? (
            <button
              onClick={() =>
                videoMuted ? onUnmuteVideo?.(uid) : onMuteVideo?.(uid)
              }
              className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title={videoMuted ? "Request unmute video" : "Mute video"}
            >
              {videoMuted ? (
                <MdVideocamOff
                  size={20}
                  className="text-red-500 dark:text-red-400"
                />
              ) : (
                <MdVideocam
                  size={20}
                  className="text-green-500 dark:text-green-400"
                />
              )}
            </button>
          ) : videoMuted ? (
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
    </div>
  );
};

export default ParticipantListItem;
