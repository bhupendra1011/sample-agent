// src/components/Controls.tsx
import React, { useState } from "react";
import useAppStore from "../store/useAppStore";
import {
  MdMic,
  MdMicOff,
  MdVideocam,
  MdVideocamOff,
  MdMonitor,
  MdClose,
  MdCallEnd,
  MdShare,
  MdDraw,
} from "react-icons/md";
import { useAgora } from "../hooks/useAgora";
import { showToast } from "../services/uiService";
import Modal from "./common/Modal";
import Button from "./common/Button";
import CopyButton from "./common/CopyButton";

const Controls: React.FC = () => {
  // ✅ Use primitive selectors for each value:
  const audioMuted = useAppStore((state) => state.audioMuted);
  const videoMuted = useAppStore((state) => state.videoMuted);
  const isScreenSharing = useAppStore((state) => state.isScreenSharing);

  const meetingName = useAppStore((state) => state.meetingName);
  const hostPassphrase = useAppStore((state) => state.hostPassphrase);
  const viewerPassphrase = useAppStore((state) => state.viewerPassphrase);
  const localUID = useAppStore((state) => state.localUID);
  // ✅ Channel can just reuse meetingName
  const channel = meetingName;

  const toggleAudioMute = useAppStore((state) => state.toggleAudioMute);
  const toggleVideoMute = useAppStore((state) => state.toggleVideoMute);

  // Whiteboard state
  const isWhiteboardActive = useAppStore((state) => state.isWhiteboardActive);
  const toggleWhiteboard = useAppStore((state) => state.toggleWhiteboard);
  const whiteboardRoomUuid = useAppStore((state) => state.whiteboardRoomUuid);

  const { startScreenshare, stopScreenshare, leaveCall, rtmChannel } =
    useAgora();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleToggleAudio = async () => {
    try {
      // Get the current audio track from Zustand store
      const currentAudioTrack = useAppStore.getState().localAudioTrack;

      if (currentAudioTrack) {
        // Toggle the actual Agora track state
        // If currently muted (audioMuted=true), enable it (setEnabled(true))
        // If currently unmuted (audioMuted=false), disable it (setEnabled(false))
        await currentAudioTrack.setEnabled(audioMuted);
      }

      // Update the Zustand store state
      toggleAudioMute();
    } catch (error) {
      console.error("Failed to toggle audio:", error);
      showToast("Failed to toggle microphone", "error");
    }
  };

  const handleToggleVideo = async () => {
    try {
      // Get the current video track from Zustand store
      const currentVideoTrack = useAppStore.getState().localVideoTrack;

      if (currentVideoTrack) {
        // Toggle the actual Agora track state
        // If currently muted (videoMuted=true), enable it (setEnabled(true))
        // If currently unmuted (videoMuted=false), disable it (setEnabled(false))
        await currentVideoTrack.setEnabled(videoMuted);
      }

      // Update the Zustand store state
      toggleVideoMute();
    } catch (error) {
      console.error("Failed to toggle video:", error);
      showToast("Failed to toggle camera", "error");
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenshare();
    } else {
      if (localUID && viewerPassphrase) {
        await startScreenshare(viewerPassphrase, String(Number(localUID) + 1));
      } else {
        showToast(
          "Cannot start screen share: Meeting information is incomplete.",
          "error"
        );
      }
    }
  };

  const handleCallEnd = async () => {
    await leaveCall();
  };

  const handleToggleWhiteboard = async () => {
    if (!whiteboardRoomUuid) {
      showToast("Whiteboard is not available for this meeting.", "error");
      return;
    }

    const isStarting = !isWhiteboardActive;
    toggleWhiteboard();

    // Broadcast whiteboard state change via RTM
    console.log(
      "Whiteboard toggle - rtmChannel:",
      rtmChannel,
      "localUID:",
      localUID
    );

    if (rtmChannel && localUID) {
      const whiteboardState = useAppStore.getState();
      const message = {
        type: isStarting ? "whiteboard-started" : "whiteboard-stopped",
        uid: localUID,
        userName: useAppStore.getState().localUsername,
        roomToken: whiteboardState.whiteboardRoomToken,
        roomUuid: whiteboardState.whiteboardRoomUuid,
        appIdentifier: whiteboardState.whiteboardAppIdentifier,
        region: whiteboardState.whiteboardRegion,
      };

      console.log("Sending whiteboard RTM message:", message);

      try {
        await rtmChannel.sendMessage({
          text: JSON.stringify(message),
        } as any);
        console.log("Whiteboard RTM message sent successfully");
      } catch (error) {
        console.error("Failed to send whiteboard sync message:", error);
        showToast("Failed to sync whiteboard state", "error");
      }
    } else {
      console.warn(
        "Cannot send whiteboard RTM - rtmChannel or localUID missing"
      );
    }
  };

  const handleShareMeeting = () => {
    if (meetingName && channel) {
      setIsShareModalOpen(true);
    } else {
      showToast("No active meeting to share.", "success");
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(`${label} copied!`, "success"))
      .catch(() => showToast(`Failed to copy ${label}.`, "error"));
  };

  const meetingUrl = `${window.location.origin}/call/${channel}`;

  return (
    <div className="flex justify-center items-center h-20 bg-gray-200 dark:bg-gray-800 space-x-6 px-4 shadow-lg transition-colors duration-300">
      <button
        onClick={handleToggleAudio}
        className="flex items-center justify-center w-14 h-14 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white text-3xl rounded-full transition-colors duration-300 hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-75"
        title={audioMuted ? "Unmute Mic" : "Mute Mic"}
      >
        {audioMuted ? <MdMicOff /> : <MdMic />}
      </button>

      <button
        onClick={handleToggleVideo}
        className="flex items-center justify-center w-14 h-14 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white text-3xl rounded-full transition-colors duration-300 hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-75"
        title={videoMuted ? "Turn Video On" : "Turn Video Off"}
      >
        {videoMuted ? <MdVideocamOff /> : <MdVideocam />}
      </button>

      <button
        onClick={handleToggleScreenShare}
        className="flex items-center justify-center w-14 h-14 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white text-3xl rounded-full transition-colors duration-300 hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-75"
        title={isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
      >
        {isScreenSharing ? <MdClose /> : <MdMonitor />}
      </button>

      <button
        onClick={handleToggleWhiteboard}
        className={`flex items-center justify-center w-14 h-14 text-3xl rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-75 ${
          isWhiteboardActive
            ? "bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700"
            : "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600"
        }`}
        title={isWhiteboardActive ? "Close Whiteboard" : "Open Whiteboard"}
      >
        <MdDraw />
      </button>

      <button
        onClick={handleShareMeeting}
        className="flex items-center justify-center w-14 h-14 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white text-3xl rounded-full transition-colors duration-300 hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-75"
        title="Share Meeting Info"
      >
        <MdShare />
      </button>

      <button
        onClick={handleCallEnd}
        className="flex items-center justify-center w-16 h-16 bg-red-600 dark:bg-red-500 text-white text-4xl rounded-full hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 shadow-lg"
        title="End Call"
      >
        <MdCallEnd />
      </button>

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Meeting Details"
      >
        <div className="space-y-4">
          {/* Host Passphrase */}
          {hostPassphrase && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Host Passphrase:
              </label>
              <div className="flex items-center justify-between p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                <span className="text-gray-900 dark:text-white text-base font-semibold truncate">
                  {hostPassphrase}
                </span>
                <CopyButton textToCopy={hostPassphrase} />
              </div>
            </div>
          )}

          {/* Attendee Passphrase */}
          {viewerPassphrase && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attendee Passphrase:
              </label>
              <div className="flex items-center justify-between p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                <span className="text-gray-900 dark:text-white text-base font-semibold truncate">
                  {viewerPassphrase}
                </span>
                <CopyButton textToCopy={viewerPassphrase} />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Controls;
