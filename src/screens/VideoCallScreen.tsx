// src/screens/VideoCallScreen.tsx
import React from "react";
import { useParams } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import VideoTile from "../components/VideoTile";
import Controls from "../components/Controls";
import ParticipantListItem from "../components/ParticipantListItem";
import Whiteboard from "../components/Whiteboard";
import { useAgora } from "../hooks/useAgora";
import type { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { MdWbSunny, MdDarkMode } from "react-icons/md";

const VideoCallScreen: React.FC = () => {
  const { channelId: urlChannelId } = useParams<{ channelId: string }>();

  const {
    localUsername,
    localUID,
    meetingName,
    audioMuted,
    videoMuted,
    userCount,
    remoteParticipants,
    theme,
    toggleTheme,
    isWhiteboardActive,
    whiteboardRoomToken,
    whiteboardRoomUuid,
  } = useAppStore();

  const { localTracks, remoteUsers } = useAgora();

  return (
    // UPDATED: Using direct Tailwind default colors for screen background/text
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Top Bar */}
      <div className="flex  items-center bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white p-4 text-lg shadow-md transition-colors duration-300">
        <span className="font-bold text-xl">
          Meeting: {meetingName || urlChannelId}
        </span>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          // UPDATED: Using direct Tailwind default colors for theme switcher button
          className="p-2 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all text-gray-800 dark:text-white ml-auto"
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

      {/* Main Content Area: Side Panel & Video Grid / Whiteboard */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side Panel (Participants List) - Only when whiteboard is NOT active */}
        {!isWhiteboardActive && (
          <div className="w-56 bg-gray-200 dark:bg-gray-800 p-4 border-r border-gray-300 dark:border-gray-700 overflow-y-auto hidden sm:block shadow-inner transition-colors duration-300">
            <strong className="text-xl mb-4 block text-gray-900 dark:text-white">
              Participants: {userCount}
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
                  name={participant.name}
                  micMuted={participant.micMuted}
                  videoMuted={participant.videoMuted}
                  isLocal={false}
                />
              ))}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
          {isWhiteboardActive ? (
            /* Whiteboard as main content */
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
            /* Video Grid as main content */
            <div className="h-full flex items-center justify-center p-4">
              {(() => {
                // Build array of all video tiles
                const allTiles = [];
                
                if (localUID && localTracks.videoTrack) {
                  allTiles.push(
                    <VideoTile
                      key={localUID}
                      uid={localUID}
                      name={localUsername}
                      isLocal={true}
                      track={localTracks.videoTrack}
                      micMuted={audioMuted}
                      videoMuted={videoMuted}
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

                const count = allTiles.length;

                // Dynamic grid classes based on participant count
                let gridClass = "";
                let itemClass = "";

                if (count === 1) {
                  // Single user: centered, large with proper aspect ratio
                  gridClass = "flex justify-center items-center w-full h-full";
                  itemClass = "w-[70%] max-w-4xl aspect-video";
                } else if (count === 2) {
                  // Two users: side by side
                  gridClass = "grid grid-cols-2 gap-4 w-full max-w-5xl";
                  itemClass = "aspect-video";
                } else if (count === 3) {
                  // Three users: 2 on top, 1 centered at bottom
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
                  // Four users: 2x2 grid
                  gridClass = "grid grid-cols-2 gap-4 w-full max-w-5xl";
                  itemClass = "aspect-video";
                } else if (count <= 6) {
                  // 5-6 users: 3 columns
                  gridClass = "grid grid-cols-3 gap-3 w-full max-w-6xl";
                  itemClass = "aspect-video";
                } else {
                  // 7+ users: 4 columns
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

        {/* Right Video Sidebar - Only when whiteboard IS active */}
        {isWhiteboardActive && (
          <div className="w-64 bg-gray-200 dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 overflow-y-auto hidden sm:flex flex-col shadow-inner transition-colors duration-300">
            <div className="p-3 border-b border-gray-300 dark:border-gray-700">
              <strong className="text-sm text-gray-900 dark:text-white">
                Participants ({userCount})
              </strong>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {/* Local user video */}
              {localUID && localTracks.videoTrack && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <VideoTile
                    key={localUID}
                    uid={localUID}
                    name={localUsername}
                    isLocal={true}
                    track={localTracks.videoTrack}
                    micMuted={audioMuted}
                    videoMuted={videoMuted}
                  />
                </div>
              )}

              {/* Remote users videos */}
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

      {/* Bottom Controls Bar */}
      <Controls />
    </div>
  );
};

export default VideoCallScreen;
