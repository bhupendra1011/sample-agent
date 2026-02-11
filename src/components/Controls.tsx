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
  MdCreate,
  MdSync,
  MdMessage,
} from "react-icons/md";
import { useAgora } from "@/hooks/useAgora";
import { showToast } from "@/services/uiService";
import { setAgentSettings as persistAgentSettings } from "@/services/settingsDb";
import { inviteAgent, stopAgent, updateAgent } from "@/api/agentApi";
import Modal from "@/components/common/Modal";
import CopyButton from "@/components/common/CopyButton";
import SettingsSidebar from "@/components/SettingsSidebar";
import TranscriptSidePanel from "@/components/TranscriptSidePanel";
import type { AgentSettings } from "@/types/agora";

// Only LLM and MLLM params support auto-update via API. Adv settings = manual restart only.
function hasUpdatableChanges(
  prev: AgentSettings | null,
  next: AgentSettings,
): boolean {
  if (!prev) return true;
  return (
    JSON.stringify(prev.llm?.system_messages) !==
      JSON.stringify(next.llm?.system_messages) ||
    JSON.stringify(prev.llm?.params) !== JSON.stringify(next.llm?.params)
  );
}

// Advanced settings require manual restart (TTS, ASR, turn detection, RTM, MLLM, tools, etc.)
function hasRestartRequiredChanges(
  prev: AgentSettings | null,
  next: AgentSettings,
): boolean {
  if (!prev) return false;
  return (
    JSON.stringify(prev.tts) !== JSON.stringify(next.tts) ||
    JSON.stringify(prev.asr) !== JSON.stringify(next.asr) ||
    JSON.stringify(prev.turn_detection) !==
      JSON.stringify(next.turn_detection) ||
    JSON.stringify(prev.advanced_features) !==
      JSON.stringify(next.advanced_features) ||
    JSON.stringify(prev.llm?.url) !== JSON.stringify(next.llm?.url) ||
    JSON.stringify(prev.llm?.api_key) !== JSON.stringify(next.llm?.api_key) ||
    prev.llm?.max_history !== next.llm?.max_history ||
    prev.llm?.style !== next.llm?.style ||
    prev.llm?.greeting_message !== next.llm?.greeting_message ||
    prev.llm?.failure_message !== next.llm?.failure_message
  );
}

interface ControlsProps {
  sendChatMessage?: (text: string, image?: File) => Promise<void>;
}

const Controls: React.FC<ControlsProps> = ({ sendChatMessage }) => {
  const audioMuted = useAppStore((state) => state.audioMuted);
  const videoMuted = useAppStore((state) => state.videoMuted);
  const isScreenSharing = useAppStore((state) => state.isScreenSharing);

  const meetingName = useAppStore((state) => state.meetingName);
  const channelId = useAppStore((state) => state.channelId);
  const hostPassphrase = useAppStore((state) => state.hostPassphrase);
  const viewerPassphrase = useAppStore((state) => state.viewerPassphrase);
  const localUID = useAppStore((state) => state.localUID);
  const isHost = useAppStore((state) => state.isHost);

  const isWhiteboardActive = useAppStore((state) => state.isWhiteboardActive);
  const toggleWhiteboard = useAppStore((state) => state.toggleWhiteboard);
  const whiteboardRoomUuid = useAppStore((state) => state.whiteboardRoomUuid);

  // Agent state
  const agentId = useAppStore((state) => state.agentId);
  const isAgentActive = useAppStore((state) => state.isAgentActive);
  const isAgentLoading = useAppStore((state) => state.isAgentLoading);
  const agentSettings = useAppStore((state) => state.agentSettings);
  const isAgentUpdating = useAppStore((state) => state.isAgentUpdating);
  const setAgentActive = useAppStore((state) => state.setAgentActive);
  const setAgentLoading = useAppStore((state) => state.setAgentLoading);
  const setAgentUpdating = useAppStore((state) => state.setAgentUpdating);
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

  const transcriptionMode = useAppStore((state) => state.transcriptionMode);
  const agentRtcUid = useAppStore((state) => state.agentRtcUid);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isTranscriptPanelOpen, setIsTranscriptPanelOpen] = useState(false);

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenshare();
    } else {
      if (localUID && viewerPassphrase) {
        await startScreenshare(viewerPassphrase, String(Number(localUID) + 1));
      } else {
        showToast(
          "Cannot start screen share: Meeting information is incomplete.",
          "error",
        );
      }
    }
  };

  const handleCallEnd = async () => {
    // leaveCall() stops agent, clears uploads, and cleans up RTC/RTM
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
    if (meetingName && channelId) {
      setIsShareModalOpen(true);
    } else {
      showToast("No active meeting to share.", "success");
    }
  };

  const handleInviteAgent = useCallback(async () => {
    if (!localUID || !channelId) {
      showToast(
        "Cannot invite agent: Meeting information is incomplete.",
        "error",
      );
      return;
    }

    if (!agentSettings) {
      // Open settings panel if not configured
      setIsSettingsPanelOpen(true);
      return;
    }

    setAgentLoading(true);
    try {
      const result = await inviteAgent(channelId, localUID, agentSettings);
      // Agent UID is typically "0" (as set in backend)
      setAgentActive(result.agentId, result.agentRtcUid || "0");
      // Ensure transcription mode is set based on current settings
      const mode = agentSettings?.advanced_features?.enable_rtm ? "rtm" : "rtc";
      useAppStore.getState().setTranscriptionMode(mode);
      showToast("AI Agent joined the call!", "success");
    } catch (error) {
      console.error("Failed to invite agent:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to invite AI agent",
        "error",
      );
      setAgentLoading(false);
    }
  }, [localUID, channelId, agentSettings, setAgentLoading, setAgentActive]);

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
      clearAgent(); // Reset to Start Agent state on error
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
    async (settings: AgentSettings) => {
      const prevSettings = useAppStore.getState().agentSettings;
      setAgentSettings(settings); // This also updates transcriptionMode

      try {
        await persistAgentSettings(settings);
      } catch (err) {
        console.error("[Controls] Failed to persist agent settings to IndexedDB:", err);
      }

      if (isAgentActive && agentId && channelId) {
        const canUpdate = hasUpdatableChanges(prevSettings, settings);
        const needsRestart = hasRestartRequiredChanges(prevSettings, settings);

        if (canUpdate) {
          setAgentUpdating(true);
          try {
            await updateAgent(agentId, channelId, settings);
            showToast("Agent configuration updated successfully!", "success");
          } catch (error) {
            console.error("Failed to update agent:", error);
            showToast(
              error instanceof Error ? error.message : "Failed to update agent",
              "error",
            );
          } finally {
            setAgentUpdating(false);
          }
        }

        if (needsRestart) {
          showToast(
            "Restart the agent for TTS/ASR/advanced changes to take effect",
            "info",
          );
        }

        if (!canUpdate && !needsRestart) {
          showToast("Agent settings saved!", "success");
        }
      } else {
        showToast("Agent settings saved!", "success");
      }
    },
    [setAgentSettings, setAgentUpdating, isAgentActive, agentId, channelId],
  );

  const controlButtonClass =
    "flex items-center justify-center w-14 h-14 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white text-3xl rounded-full transition-colors duration-300 hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-agora focus:ring-opacity-75";

  return (
    <React.Fragment>
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
            className={`flex items-center justify-center w-14 h-14 text-3xl rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-agora focus:ring-opacity-75 ${
              isWhiteboardActive
                ? "bg-agora text-white hover:opacity-90"
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
        <div className="flex-1 flex justify-end items-center gap-2">
          {isHost && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleAgent}
                disabled={isAgentLoading || isAgentUpdating}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-agora focus:ring-opacity-75 ${
                  isAgentUpdating
                    ? "bg-amber-500 dark:bg-amber-600 text-white animate-pulse"
                    : isAgentLoading
                      ? "bg-yellow-500 dark:bg-yellow-600 text-white animate-pulse"
                      : isAgentActive
                        ? "bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
                        : "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600"
                }`}
                title={
                  isAgentUpdating
                    ? "Updating agent configuration..."
                    : isAgentLoading
                      ? isAgentActive
                        ? "Agent disconnecting..."
                        : "Agent connecting..."
                      : isAgentActive
                        ? "Stop AI Agent"
                        : "Invite AI Agent"
                }
              >
                {isAgentUpdating ? (
                  <MdSync className="w-5 h-5 shrink-0 animate-spin" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 shrink-0"
                  >
                    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-3 9a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1z" />
                  </svg>
                )}
                <span className="text-sm font-medium whitespace-nowrap">
                  {isAgentUpdating
                    ? "Updating"
                    : isAgentLoading
                      ? isAgentActive
                        ? "Disconnecting"
                        : "Connecting"
                      : isAgentActive
                        ? "Stop Agent"
                        : "Start Agent"}
                </span>
              </button>
              <button
                onClick={() => setIsSettingsPanelOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-800 dark:text-white  hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-agora"
                title="Agent Settings"
              >
                <MdSettings className="w-5 h-5" />
              </button>
              {isAgentActive && (
                <button
                  onClick={() => setIsTranscriptPanelOpen(true)}
                  className="flex items-center justify-center w-10 h-10 rounded-lg  text-gray-800 dark:text-white transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-agora hover:bg-gray-400 dark:hover:bg-gray-600"
                  title="Open Transcript"
                >
                  <MdMessage className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
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

      <SettingsSidebar
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        onSaveAgentSettings={handleSaveAgentSettings}
        isAgentUpdating={isAgentUpdating}
        isAgentActive={isAgentActive}
      />

      <TranscriptSidePanel
        isOpen={isTranscriptPanelOpen}
        onClose={() => setIsTranscriptPanelOpen(false)}
        onSendMessage={
          transcriptionMode === "rtm" && agentRtcUid
            ? sendChatMessage
            : undefined
        }
      />
    </React.Fragment>
  );
};

export default Controls;
