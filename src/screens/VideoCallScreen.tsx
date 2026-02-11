"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import useAppStore from "@/store/useAppStore";
import VideoTile from "@/components/VideoTile";
import AgentTile from "@/components/AgentTile";
import Controls from "@/components/Controls";
import ParticipantListItem from "@/components/ParticipantListItem";
import Whiteboard from "@/components/Whiteboard";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import MeetingAuthHeader from "@/components/MeetingAuthHeader";
import { useAgora } from "@/hooks/useAgora";
import { useConversationalAI } from "@/hooks/useConversationalAI";
import type { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { MdWbSunny, MdDarkMode, MdTimer } from "react-icons/md";

const SESSION_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VideoCallScreenProps {
  channelId: string;
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({ channelId }) => {
  const router = useRouter();

  const {
    localUsername,
    localUID,
    meetingName,
    audioMuted,
    videoMuted,
    remoteParticipants,
    theme,
    toggleTheme,
    isWhiteboardActive,
    whiteboardRoomToken,
    whiteboardRoomUuid,
    isHost,
    pendingUnmuteRequest,
    callActive,
    isAgentActive,
    agentState,
    agentRtcUid,
    agentSettings,
    transcriptionMode,
    sessionStartTime,
    callEnd,
    logout,
  } = useAppStore();

  const [remainingMs, setRemainingMs] = useState<number>(SESSION_DURATION_MS);

  useEffect(() => {
    if (!callActive) {
      router.push("/");
    }
  }, [callActive, router]);

  // Session timer: countdown and auto-logout at 0
  useEffect(() => {
    if (!sessionStartTime) return;
    const update = () => {
      const elapsed = Date.now() - sessionStartTime;
      const remaining = SESSION_DURATION_MS - elapsed;
      setRemainingMs(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const { leaveCall } = useAgora();

  const handleSessionExpired = useCallback(async () => {
    await leaveCall();
    callEnd();
    logout();
    void signOut({ callbackUrl: "/" });
  }, [leaveCall, callEnd, logout]);

  useEffect(() => {
    if (remainingMs <= 0 && sessionStartTime != null) {
      handleSessionExpired();
    }
  }, [remainingMs, sessionStartTime, handleSessionExpired]);

  const participantCount =
    1 +
    Object.keys(remoteParticipants).filter(
      (uid) => uid !== String(localUID)
    ).length;

  const {
    localTracks,
    remoteUsers,
    sendHostControlRequest,
    acceptUnmuteRequest,
    declineUnmuteRequest,
    rtcClient,
    rtmClient,
  } = useAgora();

  // Initialize conversational AI hook for transcript handling
  const { sendChatMessage } = useConversationalAI({
    rtcClient,
    rtmClient,
    channelId,
    isAgentActive,
    transcriptionMode,
    agentRtcUid,
  });

  const handleMuteAudio = useCallback(
    (uid: string) => {
      sendHostControlRequest(uid, "mute", "audio");
    },
    [sendHostControlRequest]
  );

  const handleMuteVideo = useCallback(
    (uid: string) => {
      sendHostControlRequest(uid, "mute", "video");
    },
    [sendHostControlRequest]
  );

  const handleUnmuteAudio = useCallback(
    (uid: string) => {
      sendHostControlRequest(uid, "unmute", "audio");
    },
    [sendHostControlRequest]
  );

  const handleUnmuteVideo = useCallback(
    (uid: string) => {
      sendHostControlRequest(uid, "unmute", "video");
    },
    [sendHostControlRequest]
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Top Bar */}
      <div className="flex items-center bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white p-4 text-lg shadow-md transition-colors duration-300">
        <span className="font-bold text-xl font-syne">
          Meeting: {meetingName || channelId}
        </span>

        <div className="flex items-center gap-3 ml-auto">
          {/* Transmission Badge - shown when agent is active */}
          {isAgentActive && (
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                transcriptionMode === "rtm"
                  ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              }`}
            >
              Transmission: {transcriptionMode.toUpperCase()}
            </span>
          )}

          {sessionStartTime != null && (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium tabular-nums"
              title="Session ends in 15 minutes; you will be logged out when time runs out."
            >
              <MdTimer className="w-4 h-4 text-[var(--agora-accent-blue)] shrink-0" aria-hidden />
              {formatRemaining(remainingMs)}
            </span>
          )}

          <MeetingAuthHeader inline />

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--agora-accent-blue)] transition-all text-gray-800 dark:text-white"
            title={
              theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
            }
          >
            {theme === "dark" ? (
              <MdWbSunny size={24} className="text-yellow-400" />
            ) : (
              <MdDarkMode size={24} className="text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {!isWhiteboardActive && (
          <div className="w-56 bg-gray-200 dark:bg-gray-800 p-4 border-r border-gray-300 dark:border-gray-700 overflow-y-auto hidden sm:block shadow-inner transition-colors duration-300">
            <strong className="text-xl mb-4 block text-gray-900 dark:text-white">
              Participants: {participantCount}
            </strong>
            <hr className="my-3 border-gray-300 dark:border-gray-600" />
            <ParticipantListItem
              name={localUsername}
              micMuted={audioMuted}
              videoMuted={videoMuted}
              isLocal={true}
            />
            <hr className="my-3 border-gray-300 dark:border-gray-600" />

            {Object.entries(remoteParticipants)
              .filter(([uid]) => uid !== String(localUID))
              .map(([uid, participant]) => (
                <ParticipantListItem
                  key={uid}
                  uid={uid}
                  name={participant.name}
                  micMuted={participant.micMuted}
                  videoMuted={participant.videoMuted}
                  isLocal={false}
                  isHost={isHost}
                  onMuteAudio={handleMuteAudio}
                  onMuteVideo={handleMuteVideo}
                  onUnmuteAudio={handleUnmuteAudio}
                  onUnmuteVideo={handleUnmuteVideo}
                />
              ))}
          </div>
        )}

        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
          {isWhiteboardActive ? (
            <div className="h-full w-full p-2">
              <Whiteboard
                roomUuid={whiteboardRoomUuid}
                roomToken={whiteboardRoomToken}
                uid={`user-${Date.now()}-${Math.random()
                  .toString(36)
                  .substr(2, 9)}`}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              {(() => {
                const allTiles = [];

                if (localUID) {
                  allTiles.push(
                    <VideoTile
                      key={localUID}
                      uid={localUID}
                      name={localUsername}
                      isLocal={true}
                      track={localTracks.videoTrack}
                      micMuted={audioMuted}
                      videoMuted={!localTracks.videoTrack || videoMuted}
                    />
                  );
                }

                remoteUsers.forEach((user: IAgoraRTCRemoteUser) => {
                  const participantInfo = remoteParticipants[String(user.uid)];
                  allTiles.push(
                    <VideoTile
                      key={user.uid}
                      uid={user.uid}
                      name={participantInfo?.name || `User ${user.uid}`}
                      isLocal={false}
                      track={user.videoTrack || null}
                      micMuted={participantInfo?.micMuted || true}
                      videoMuted={participantInfo?.videoMuted || true}
                    />
                  );
                });

                // Add Agent Tile if agent is active
                if (isAgentActive && agentRtcUid) {
                  allTiles.push(
                    <AgentTile
                      key={`agent-${agentRtcUid}`}
                      agentUid={agentRtcUid}
                      agentState={agentState}
                      agentName={agentSettings?.name || "AI Agent"}
                      transcriptionMode={transcriptionMode}
                    />
                  );
                }

                const count = allTiles.length;
                let gridClass = "";
                let itemClass = "";

                if (count === 1) {
                  gridClass = "flex justify-center items-center w-full h-full";
                  itemClass = "w-[70%] max-w-4xl aspect-video";
                } else if (count === 2) {
                  gridClass = "grid grid-cols-2 gap-4 w-full max-w-5xl";
                  itemClass = "aspect-video";
                } else if (count === 3) {
                  return (
                    <div className="flex flex-col gap-4 w-full max-w-5xl">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="aspect-video">{allTiles[0]}</div>
                        <div className="aspect-video">{allTiles[1]}</div>
                      </div>
                      <div className="flex justify-center">
                        <div className="aspect-video w-1/2">{allTiles[2]}</div>
                      </div>
                    </div>
                  );
                } else if (count === 4) {
                  gridClass = "grid grid-cols-2 gap-4 w-full max-w-5xl";
                  itemClass = "aspect-video";
                } else if (count <= 6) {
                  gridClass = "grid grid-cols-3 gap-3 w-full max-w-6xl";
                  itemClass = "aspect-video";
                } else {
                  gridClass = "grid grid-cols-4 gap-2 w-full max-w-7xl";
                  itemClass = "aspect-video";
                }

                return (
                  <div className={gridClass}>
                    {allTiles.map((tile, index) => (
                      <div key={index} className={itemClass}>
                        {tile}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {isWhiteboardActive && (
          <div className="w-64 bg-gray-200 dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 overflow-y-auto hidden sm:flex flex-col shadow-inner transition-colors duration-300">
            <div className="p-3 border-b border-gray-300 dark:border-gray-700">
              <strong className="text-sm text-gray-900 dark:text-white">
                Participants ({participantCount})
              </strong>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {localUID && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <VideoTile
                    key={localUID}
                    uid={localUID}
                    name={localUsername}
                    isLocal={true}
                    track={localTracks.videoTrack}
                    micMuted={audioMuted}
                    videoMuted={!localTracks.videoTrack || videoMuted}
                  />
                </div>
              )}

              {remoteUsers.map((user: IAgoraRTCRemoteUser) => {
                const participantInfo = remoteParticipants[String(user.uid)];
                return (
                  <div
                    key={user.uid}
                    className="aspect-video rounded-lg overflow-hidden"
                  >
                    <VideoTile
                      uid={user.uid}
                      name={participantInfo?.name || `User ${user.uid}`}
                      isLocal={false}
                      track={user.videoTrack || null}
                      micMuted={participantInfo?.micMuted || true}
                      videoMuted={participantInfo?.videoMuted || true}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Controls sendChatMessage={sendChatMessage} />

      <Modal
        isOpen={!!pendingUnmuteRequest}
        onClose={declineUnmuteRequest}
        title="Unmute Request"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>{pendingUnmuteRequest?.fromName}</strong> (Host) is
            requesting you to unmute your{" "}
            {pendingUnmuteRequest?.mediaType === "both"
              ? "microphone and camera"
              : pendingUnmuteRequest?.mediaType}
            .
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your privacy is protected. You can accept or decline this request.
          </p>
          <div className="flex space-x-3 pt-2">
            <Button onClick={acceptUnmuteRequest} variant="primary">
              Accept
            </Button>
            <Button onClick={declineUnmuteRequest} variant="secondary">
              Decline
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VideoCallScreen;
