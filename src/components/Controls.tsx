"use client";

import React, { useState, useCallback } from "react";
import useAppStore from "@/store/useAppStore";
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
  MdSettings,
} from "react-icons/md";
import { useAgora } from "@/hooks/useAgora";
import { showToast } from "@/services/uiService";
import { inviteAgent, stopAgent } from "@/api/agentApi";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import CopyButton from "@/components/common/CopyButton";
import AgentSettingsSidebar from "@/components/AgentSettingsSidebar";
import type { AgentSettings } from "@/types/agora";

const Controls: React.FC = () => {
  const audioMuted = useAppStore((state) => state.audioMuted);
  const videoMuted = useAppStore((state) => state.videoMuted);
  const isScreenSharing = useAppStore((state) => state.isScreenSharing);

  const meetingName = useAppStore((state) => state.meetingName);
  const hostPassphrase = useAppStore((state) => state.hostPassphrase);
  const viewerPassphrase = useAppStore((state) => state.viewerPassphrase);
  const localUID = useAppStore((state) => state.localUID);
  const isHost = useAppStore((state) => state.isHost);
  const channel = meetingName;

  const isWhiteboardActive = useAppStore((state) => state.isWhiteboardActive);
  const toggleWhiteboard = useAppStore((state) => state.toggleWhiteboard);
  const whiteboardRoomUuid = useAppStore((state) => state.whiteboardRoomUuid);

  // Agent state
  const agentId = useAppStore((state) => state.agentId);
  const isAgentActive = useAppStore((state) => state.isAgentActive);
  const isAgentLoading = useAppStore((state) => state.isAgentLoading);
  const agentSettings = useAppStore((state) => state.agentSettings);
  const setAgentActive = useAppStore((state) => state.setAgentActive);
  const setAgentLoading = useAppStore((state) => state.setAgentLoading);
  const clearAgent = useAppStore((state) => state.clearAgent);
  const setAgentSettings = useAppStore((state) => state.setAgentSettings);

  const {
    startScreenshare,
    stopScreenshare,
    leaveCall,
    publishRtmMessage,
    toggleLocalAudio,
    toggleLocalVideo,
  } = useAgora();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

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
    // Stop agent before leaving if active
    if (isAgentActive && agentId) {
      try {
        await stopAgent(agentId);
      } catch (error) {
        console.error("Failed to stop agent on call end:", error);
      }
      clearAgent();
    }
    await leaveCall();
  };

  const handleToggleWhiteboard = async () => {
    if (!whiteboardRoomUuid) {
      showToast("Whiteboard is not available for this meeting.", "error");
      return;
    }

    const isStarting = !isWhiteboardActive;
    toggleWhiteboard();

    if (localUID) {
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

      try {
        await publishRtmMessage(JSON.stringify(message));
      } catch (error) {
        console.error("Failed to send whiteboard sync message:", error);
        showToast("Failed to sync whiteboard state", "error");
      }
    }
  };

  const handleShareMeeting = () => {
    if (meetingName && channel) {
      setIsShareModalOpen(true);
    } else {
      showToast("No active meeting to share.", "success");
    }
  };

  const handleInviteAgent = useCallback(async () => {
    if (!localUID || !channel) {
      showToast("Cannot invite agent: Meeting information is incomplete.", "error");
      return;
    }

    if (!agentSettings) {
      // Open settings panel if not configured
      setIsSettingsPanelOpen(true);
      return;
    }

    setAgentLoading(true);
    try {
      const result = await inviteAgent(channel, localUID, agentSettings);
      setAgentActive(result.agentId);
      showToast("AI Agent joined the call!", "success");
    } catch (error) {
      console.error("Failed to invite agent:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to invite AI agent",
        "error"
      );
      setAgentLoading(false);
    }
  }, [localUID, channel, agentSettings, setAgentLoading, setAgentActive]);

  const handleStopAgent = useCallback(async () => {
    if (!agentId) return;

    setAgentLoading(true);
    try {
      await stopAgent(agentId);
      clearAgent();
      showToast("AI Agent left the call.", "success");
    } catch (error) {
      console.error("Failed to stop agent:", error);
      showToast("Failed to stop AI agent", "error");
      setAgentLoading(false);
    }
  }, [agentId, setAgentLoading, clearAgent]);

  const handleToggleAgent = useCallback(() => {
    if (isAgentActive) {
      handleStopAgent();
    } else {
      handleInviteAgent();
    }
  }, [isAgentActive, handleStopAgent, handleInviteAgent]);

  const handleSaveAgentSettings = useCallback(
    (settings: AgentSettings) => {
      setAgentSettings(settings);
      showToast("Agent settings saved!", "success");
    },
    [setAgentSettings]
  );

  const controlButtonClass =
    "flex items-center justify-center w-14 h-14 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white text-3xl rounded-full transition-colors duration-300 hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-75";

  return (
    <div className="flex justify-center items-center h-20 bg-gray-200 dark:bg-gray-800 px-4 shadow-lg transition-colors duration-300">
      {/* Left spacer for balance */}
      <div className="flex-1" />

      {/* Center controls */}
      <div className="flex items-center space-x-6">
        <button
          onClick={toggleLocalAudio}
          className={controlButtonClass}
          title={audioMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {audioMuted ? <MdMicOff /> : <MdMic />}
        </button>

        <button
          onClick={toggleLocalVideo}
          className={controlButtonClass}
          title={videoMuted ? "Turn Video On" : "Turn Video Off"}
        >
          {videoMuted ? <MdVideocamOff /> : <MdVideocam />}
        </button>

        <button
          onClick={handleToggleScreenShare}
          className={controlButtonClass}
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
          className={controlButtonClass}
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
      </div>

      {/* Right side - Agent controls */}
      <div className="flex-1 flex justify-end">
        {isHost && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleAgent}
              disabled={isAgentLoading}
              className={`flex items-center justify-center w-14 h-14 text-3xl rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-75 ${
                isAgentLoading
                  ? "bg-yellow-500 dark:bg-yellow-600 text-white animate-pulse"
                  : isAgentActive
                  ? "bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600"
              }`}
              title={
                isAgentLoading
                  ? "Agent loading..."
                  : isAgentActive
                  ? "Stop AI Agent"
                  : "Invite AI Agent"
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-8 h-8"
              >
                <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-3 9a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1z" />
              </svg>
            </button>
            <button
              onClick={() => setIsSettingsPanelOpen(true)}
              className="flex items-center justify-center w-12 h-12 text-2xl rounded-full bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              title="Agent Settings"
            >
              <MdSettings />
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Meeting Details"
      >
        <div className="space-y-4">
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

      <AgentSettingsSidebar
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        onSave={handleSaveAgentSettings}
      />
    </div>
  );
};

export default Controls;
