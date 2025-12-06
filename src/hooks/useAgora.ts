// src/hooks/useAgora.ts

import { useEffect, useState, useRef, useCallback } from "react";
import AgoraRTC from "agora-rtc-sdk-ng"; // Agora Web RTC SDK
import AgoraRTM from "agora-rtm-sdk"; // Agora RTM SDK (v1.x for this project)
import useAppStore from "../store/useAppStore"; // Zustand store for global client state
import { AGORA_CONFIG } from "../api/agoraApi"; // Agora App ID and API Key from your config
import { showToast } from "../services/uiService"; // Toast notifications
import type { LocalAgoraTracks, MeetingResponse } from "../types/agora"; // Custom types

// --- Initialize Agora RTC and RTM clients as singletons ---
const RTC_CLIENT = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }); // RTC Client for audio/video
const RTM_CLIENT = AgoraRTM.createInstance(AGORA_CONFIG.APP_ID); // For v1.x, use createInstance with App ID

// --- Variables to hold Agora-related instances and data within the module scope ---
let rtmChannel: AgoraRTM.Channel | null = null;
let screenClient: AgoraRTC.IAgoraRTCClient | null = null;
let screenVideoTrack: AgoraRTC.ILocalVideoTrack | null = null;
let screenAudioTrack: AgoraRTC.ILocalAudioTrack | null = null;

let currentScreenShareToken: string | null = null;
let currentScreenShareUid: string | null = null;
let currentChannelId: string | null = null; // The ID of the currently active Agora channel

/**
 * Custom React Hook for managing all Agora RTC and RTM client-side logic.
 */
export const useAgora = () => {
  // --- 1. Zustand Selectors (at the top of the hook's body) ---
  const localUID = useAppStore((state) => state.localUID);
  const localUsername = useAppStore((state) => state.localUsername);
  const audioMuted = useAppStore((state) => state.audioMuted);
  const videoMuted = useAppStore((state) => state.videoMuted);
  const isScreenSharing = useAppStore((state) => state.isScreenSharing);
  const localAudioTrackZustand = useAppStore((state) => state.localAudioTrack);
  const localVideoTrackZustand = useAppStore((state) => state.localVideoTrack);
  const setLocalTracksZustand = useAppStore((state) => state.setLocalTracks);
  const getAppStore = useAppStore; // Get the store hook itself to access state inside callbacks

  // Get actions from Zustand store
  const increaseUserCount = useAppStore((state) => state.increaseUserCount);
  const decreaseUserCount = useAppStore((state) => state.decreaseUserCount);
  const updateRemoteParticipant = useAppStore(
    (state) => state.updateRemoteParticipant
  );
  const removeRemoteParticipant = useAppStore(
    (state) => state.removeRemoteParticipant
  );
  const setScreenShareStatus = useAppStore(
    (state) => state.setScreenShareStatus
  );
  const callEnd = useAppStore((state) => state.callEnd);

  // --- 2. Local React States (useState) and Refs (useRef) ---
  const [remoteUsers, setRemoteUsers] = useState<
    AgoraRTC.IAgoraRTCRemoteUser[]
  >([]);
  const remoteUsersRef = useRef<Record<string, AgoraRTC.IAgoraRTCRemoteUser>>(
    {}
  );
  // Track which remote users have been counted to prevent double counting
  const countedUsersRef = useRef<Set<string>>(new Set());

  const localTracksRef = useRef<LocalAgoraTracks>({
    audioTrack: null,
    videoTrack: null,
  });

  // --- 3. Agora RTC/RTM Event Handlers (useCallback) ---

  const handleUserPublished = useCallback(
    async (
      user: AgoraRTC.IAgoraRTCRemoteUser,
      mediaType: "video" | "audio"
    ) => {
      console.log("User published:", user.uid, mediaType);

      try {
        // Subscribe to the user's tracks
        await RTC_CLIENT.subscribe(user, mediaType);
        console.log("Successfully subscribed to user:", user.uid, mediaType);

        const userUidStr = String(user.uid);

        if (mediaType === "video") {
          // SYNCHRONOUSLY check and mark user as counted FIRST to prevent race conditions
          const shouldIncrementCount = !countedUsersRef.current.has(userUidStr);
          if (shouldIncrementCount) {
            // Mark as counted IMMEDIATELY before any async operations
            countedUsersRef.current.add(userUidStr);
            increaseUserCount();
            console.log("Increased user count for new video user:", userUidStr);
          }

          // Update remote users state - only for video
          setRemoteUsers((prev) => {
            // Check if user already exists in ref
            if (remoteUsersRef.current[userUidStr]) {
              // Update existing user
              remoteUsersRef.current[userUidStr] = user;
              return prev.map((u) => (String(u.uid) === userUidStr ? user : u));
            }
            // Add new user
            remoteUsersRef.current[userUidStr] = user;
            console.log(
              "Added new remote user to state:",
              userUidStr,
              "Total:",
              prev.length + 1
            );
            return [...prev, user];
          });
        }

        // Get existing participant info (might be set by RTM message)
        const existingParticipant =
          getAppStore.getState().remoteParticipants[userUidStr];

        // Update participant info for both audio and video
        updateRemoteParticipant({
          uid: userUidStr,
          name: existingParticipant?.name || `User ${user.uid}`,
          micMuted: !user.hasAudio,
          videoMuted: !user.hasVideo,
        });
      } catch (error) {
        console.error("Failed to subscribe to user:", error);
      }
    },
    [increaseUserCount, updateRemoteParticipant, getAppStore]
  );

  const handleUserUnpublished = useCallback(
    (user: AgoraRTC.IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
      console.log("User unpublished:", user.uid, mediaType);

      if (mediaType === "video") {
        setRemoteUsers((prev) => {
          delete remoteUsersRef.current[String(user.uid)];
          return prev.filter((u) => String(u.uid) !== String(user.uid));
        });
      }

      updateRemoteParticipant({
        uid: String(user.uid),
        micMuted: mediaType === "audio" ? true : undefined,
        videoMuted: mediaType === "video" ? true : undefined,
      });
    },
    [updateRemoteParticipant]
  );

  const handleUserLeft = useCallback(
    (user: AgoraRTC.IAgoraRTCRemoteUser) => {
      console.log("User left:", user.uid);
      const userUidStr = String(user.uid);

      // Remove from remote users
      delete remoteUsersRef.current[userUidStr];
      setRemoteUsers((prev) =>
        prev.filter((u) => String(u.uid) !== userUidStr)
      );

      // Only decrease count if this user was counted
      if (countedUsersRef.current.has(userUidStr)) {
        countedUsersRef.current.delete(userUidStr);
        decreaseUserCount();
        console.log("Decreased user count for leaving user:", userUidStr);
      }
      removeRemoteParticipant({ uid: userUidStr });

      // Send RTM message about user leaving
      if (rtmChannel) {
        rtmChannel
          .sendMessage({
            text: JSON.stringify({
              type: "user-left",
              uid: user.uid,
            }),
          } as any)
          .catch((error) => {
            console.error("Failed to send user-left message:", error);
          });
      }
    },
    [decreaseUserCount, removeRemoteParticipant]
  );

  const handleRemoteUserAttributesUpdated = useCallback(
    (uid: string, attributes: Record<string, string>) => {
      console.log("Remote user attributes updated:", uid, attributes);

      updateRemoteParticipant({
        uid: uid,
        name: attributes.name || `User ${uid}`,
        micMuted: attributes.micMuted === "true",
        videoMuted: attributes.videoMuted === "true",
      });
    },
    [updateRemoteParticipant]
  );

  const handleRTMMessage = useCallback(
    (message: AgoraRTM.ChannelMessage) => {
      try {
        const data = JSON.parse(message.text || "");
        console.log("RTM message received:", data.type, data);

        switch (data.type) {
          case "user-joined":
            // Validate uid exists
            if (!data.uid) {
              console.error("RTM user-joined message missing uid:", data);
              break;
            }

            const joinedUid = String(data.uid);
            console.log(
              "Processing user-joined RTM message for uid:",
              joinedUid
            );

            // Update participant info in Zustand store
            updateRemoteParticipant({
              uid: joinedUid,
              name: data.name || `User ${joinedUid}`,
              micMuted: data.micMuted,
              videoMuted: data.videoMuted,
            });

            // Check if this user is already in the RTC client's remote users
            // This handles the case where RTM message arrives before RTC user-published event
            setTimeout(() => {
              const remoteUsersList = RTC_CLIENT.remoteUsers;
              const existingUser = remoteUsersList.find(
                (u) => String(u.uid) === joinedUid
              );

              if (
                existingUser &&
                existingUser.videoTrack &&
                !remoteUsersRef.current[joinedUid]
              ) {
                console.log(
                  "Found existing remote user in RTC client, adding to state:",
                  joinedUid
                );
                // User exists in RTC but not in our state, add them
                setRemoteUsers((prev) => {
                  if (prev.find((u) => String(u.uid) === joinedUid)) {
                    return prev; // Already exists
                  }
                  remoteUsersRef.current[joinedUid] = existingUser;
                  return [...prev, existingUser];
                });
              }
            }, 1000); // Give RTC some time to process
            break;

          case "user-left":
            console.log("User left via RTM:", data.uid);
            break;

          case "media-state-updated":
            updateRemoteParticipant({
              uid: String(data.uid),
              micMuted: data.micMuted,
              videoMuted: data.videoMuted,
            });
            break;

          case "whiteboard-started":
            // Sync whiteboard start across all users
            const currentState = getAppStore.getState();
            if (String(data.uid) !== String(currentState.localUID)) {
              console.log("Whiteboard started by another user:", data.uid);
              currentState.setWhiteboardCredentials(
                data.roomToken,
                data.roomUuid,
                data.appIdentifier || "",
                data.region || ""
              );
              if (!currentState.isWhiteboardActive) {
                currentState.toggleWhiteboard();
              }
              showToast(
                `Whiteboard started by ${data.userName || "another user"}`,
                "success"
              );
            }
            break;

          case "whiteboard-stopped":
            // Sync whiteboard stop across all users
            const currentState2 = getAppStore.getState();
            if (
              String(data.uid) !== String(currentState2.localUID) &&
              currentState2.isWhiteboardActive
            ) {
              console.log("Whiteboard stopped by another user:", data.uid);
              currentState2.toggleWhiteboard();
              showToast(
                `Whiteboard stopped by ${data.userName || "another user"}`,
                "success"
              );
            }
            break;

          default:
            console.log("Unknown RTM message type:", data.type);
        }
      } catch (error) {
        console.error("Failed to parse RTM message:", error);
      }
    },
    [updateRemoteParticipant, getAppStore]
  );

  // --- 4. Core Agora SDK Utility Functions (useCallback) ---

  const createLocalTracks = useCallback(async (): Promise<LocalAgoraTracks> => {
    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const videoTrack = await AgoraRTC.createCameraVideoTrack();
    setLocalTracksZustand(audioTrack, videoTrack); // Store tracks in Zustand
    localTracksRef.current = { audioTrack, videoTrack }; // Also update ref for immediate use within hook
    return { audioTrack, videoTrack };
  }, [setLocalTracksZustand]); // Dependency: setLocalTracksZustand action

  const initializeAgoraRTM = useCallback(
    async (
      uid: string,
      token: string,
      channelId: string,
      localUsername: string,
      audioMutedState: boolean,
      videoMutedState: boolean
    ) => {
      try {
        // Step 1: Login to RTM with token
        await RTM_CLIENT.login({ uid, token });

        // Step 2: Create channel instance
        rtmChannel = RTM_CLIENT.createChannel(channelId);

        // Step 3: Set up channel event listeners
        rtmChannel.on("ChannelMessage", handleRTMMessage);
        rtmChannel.on("MemberJoined", (memberId: string) => {
          console.log("RTM Member joined:", memberId);
        });
        rtmChannel.on("MemberLeft", (memberId: string) => {
          console.log("RTM Member left:", memberId);
        });

        // Step 4: Join the RTM channel
        await rtmChannel.join();

        // Step 5: Set initial user attributes
        await RTM_CLIENT.setLocalUserAttributes({
          name: localUsername,
          micMuted: audioMutedState.toString(),
          videoMuted: videoMutedState.toString(),
        });

        // Step 6: Listen for remote user attribute updates
        // In RTM v2.x, this event might be different - check documentation
        RTM_CLIENT.on("UserAttributesUpdated", (attributes, uid) => {
          handleRemoteUserAttributesUpdated(uid, attributes);
        });

        console.log("RTM initialized successfully for channel:", channelId);
      } catch (error) {
        console.error("Failed to initialize RTM:", error);
        showToast("Failed to initialize RTM. Please try again.", "error");
        throw error;
      }
    },
    [handleRTMMessage, handleRemoteUserAttributesUpdated]
  ); // Dependencies

  // --- 5. Screen Share Functions (MUST BE DEFINED BEFORE _cleanupAgoraResources) ---

  const stopScreenshare = useCallback(async () => {
    if (!isScreenSharing) return;
    if (screenVideoTrack) {
      screenVideoTrack.close();
      screenVideoTrack = null;
    }
    if (screenAudioTrack) {
      screenAudioTrack.close();
      screenAudioTrack = null;
    }
    if (screenClient && screenClient.connectionState === "CONNECTED") {
      await screenClient.leave();
      screenClient = null;
    }
    showToast("Screen sharing stopped", "success");
    setScreenShareStatus(false);
  }, [isScreenSharing, setScreenShareStatus]); // Dependencies for stopScreenshare

  const startScreenshare = useCallback(
    async (
      screenShareRtcToken: string,
      screenShareUidFromApi: string
    ): Promise<boolean> => {
      if (isScreenSharing) return false;
      currentScreenShareToken = screenShareRtcToken;
      currentScreenShareUid = screenShareUidFromApi;
      if (
        !currentScreenShareToken ||
        !currentChannelId ||
        !currentScreenShareUid
      ) {
        /* ... */ return false;
      }
      screenClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      try {
        /* ... */
      } catch (error) {
        /* ... */
      }
      return true; // Return true on success
    },
    [
      isScreenSharing,
      setScreenShareStatus,
      AGORA_CONFIG.APP_ID,
      stopScreenshare,
    ]
  ); // Dependencies: stopScreenshare

  // --- 6. Internal Cleanup Helper (MUST BE DEFINED BEFORE joinMeeting/leaveCall) ---

  const _cleanupAgoraResources = useCallback(
    async (
      currentLocalAudioTrack: AgoraRTC.IAudioTrack | null,
      currentLocalVideoTrack: AgoraRTC.IVideoTrack | null,
      isScreenSharingStatus: boolean,
      setScreenShareStatusAction: (status: boolean) => void,
      callEndAction: () => void,
      stopScreenshareAction: () => Promise<void> // Passed `stopScreenshare` from outer scope
    ) => {
      if (currentLocalAudioTrack) {
        currentLocalAudioTrack.close();
      }
      if (currentLocalVideoTrack) {
        currentLocalVideoTrack.close();
      }
      if (RTC_CLIENT && RTC_CLIENT.connectionState === "CONNECTED") {
        await RTC_CLIENT.leave();
      }
      if (rtmChannel && rtmChannel.channelId) {
        await rtmChannel.leave();
        rtmChannel = null;
      }
      if (RTM_CLIENT && RTM_CLIENT.connectionState === "CONNECTED") {
        await RTM_CLIENT.logout();
      }
      if (isScreenSharingStatus) {
        await stopScreenshareAction();
      } // Call the passed action
      showToast("Resources cleaned up.", "info");
      callEndAction();
    },
    []
  ); // No dependencies from useAgora scope, all passed as args or module-level

  // --- 7. Exposed Call Control Functions (MUST BE DEFINED AFTER cleanup helper) ---

  const leaveCall = useCallback(async () => {
    await _cleanupAgoraResources(
      localAudioTrackZustand, // Use tracks from Zustand state
      localVideoTrackZustand,
      isScreenSharing,
      setScreenShareStatus,
      callEnd,
      stopScreenshare // Pass stopScreenshare action
    );
  }, [
    _cleanupAgoraResources,
    localAudioTrackZustand,
    localVideoTrackZustand,
    isScreenSharing,
    setScreenShareStatus,
    callEnd,
    stopScreenshare,
  ]);

  const joinMeeting = useCallback(
    async (
      rtcToken: string,
      rtmToken: string,
      uid: number, // uid from MeetingResponse.mainUser.uid
      channelId: string,
      meetingName: string,
      hostPassphrase?: string,
      viewerPassphrase?: string,
      userName?: string,
      screenShareRtcToken?: string, // Actual token from MeetingResponse.screenShare.rtc
      screenShareUid?: number, // Actual UID from MeetingResponse.screenShare.uid
      screenShareRtmToken?: string | null // Actual RTM from MeetingResponse.screenShare.rtm
    ) => {
      try {
        // Clean up any existing connections before joining
        if (
          RTC_CLIENT &&
          (RTC_CLIENT.connectionState === "CONNECTING" ||
            RTC_CLIENT.connectionState === "CONNECTED")
        ) {
          console.log("RTC client already connected, leaving first...");
          try {
            await RTC_CLIENT.leave();
          } catch (leaveError) {
            console.warn("Error leaving existing RTC connection:", leaveError);
          }
        }

        // Clean up RTM if already connected
        if (rtmChannel && rtmChannel.channelId) {
          try {
            await rtmChannel.leave();
            rtmChannel.removeAllListeners();
            rtmChannel = null;
          } catch (rtmLeaveError) {
            console.warn("Error leaving existing RTM channel:", rtmLeaveError);
          }
        }

        // Logout RTM client if logged in
        try {
          RTM_CLIENT.removeAllListeners();
          await RTM_CLIENT.logout();
        } catch (rtmLogoutError: any) {
          // Ignore errors if not logged in
          if (rtmLogoutError?.code !== "RTM_LOGIN_ERROR_NOT_LOGGED_IN") {
            console.warn("Error logging out RTM client:", rtmLogoutError);
          }
        }

        // Reset remote users state and counted users
        setRemoteUsers([]);
        remoteUsersRef.current = {};
        countedUsersRef.current.clear();

        currentChannelId = channelId;
        currentScreenShareToken = screenShareRtcToken || null;
        currentScreenShareUid = String(screenShareUid);

        const { audioTrack, videoTrack } = await createLocalTracks();
        if (!audioTrack || !videoTrack) {
          throw new Error("Failed to create local tracks.");
        }

        await RTC_CLIENT.join(
          AGORA_CONFIG.APP_ID,
          channelId,
          rtcToken || null,
          uid
        );
        await initializeAgoraRTM(
          String(uid),
          rtmToken,
          channelId,
          userName || `User ${uid}`,
          audioMuted,
          videoMuted
        );
        await RTC_CLIENT.publish([audioTrack, videoTrack]);

        // Count local user (don't add local user to remoteParticipants - they're not remote!)
        increaseUserCount();

        // Send RTM message to notify other users
        rtmChannel?.sendMessage({
          text: JSON.stringify({
            type: "user-joined",
            uid: uid,
            name: userName || `User ${uid}`,
            micMuted: audioMuted,
            videoMuted: videoMuted,
          }),
        } as AgoraRTM.Message);

        showToast("Joined meeting successfully!", "success");
      } catch (error) {
        console.error("Failed to join meeting:", error);
        showToast("Failed to join meeting. Please try again.", "error");
        // Pass current Zustand state and actions to cleanup helper
        await _cleanupAgoraResources(
          getAppStore.getState().localAudioTrack,
          getAppStore.getState().localVideoTrack,
          getAppStore.getState().isScreenSharing,
          getAppStore.getState().setScreenShareStatus,
          getAppStore.getState().callEnd,
          stopScreenshare // Pass stopScreenshare action
        );
        throw error;
      }
    },
    [
      AGORA_CONFIG.APP_ID,
      audioMuted,
      callEnd,
      createLocalTracks,
      getAppStore,
      increaseUserCount,
      initializeAgoraRTM,
      stopScreenshare,
      updateRemoteParticipant,
    ] // Added all necessary dependencies
  );

  // --- 8. useEffect hooks (after all handlers/functions they depend on) ---

  useEffect(() => {
    // Remove ALL existing listeners first to prevent duplicates
    RTC_CLIENT.removeAllListeners("user-published");
    RTC_CLIENT.removeAllListeners("user-unpublished");
    RTC_CLIENT.removeAllListeners("user-left");

    // Set up RTC event listeners
    RTC_CLIENT.on("user-published", handleUserPublished);
    RTC_CLIENT.on("user-unpublished", handleUserUnpublished);
    RTC_CLIENT.on("user-left", handleUserLeft);

    return () => {
      // Cleanup listeners on unmount
      RTC_CLIENT.removeAllListeners("user-published");
      RTC_CLIENT.removeAllListeners("user-unpublished");
      RTC_CLIENT.removeAllListeners("user-left");
    };
  }, [handleUserPublished, handleUserUnpublished, handleUserLeft]);

  const isValidTrack = (track: any) =>
    track &&
    typeof track.setEnabled === "function" &&
    typeof track.close === "function" &&
    !track.isClosed &&
    (track.constructor?.name === "MicrophoneAudioTrack" ||
      track.constructor?.name === "CameraVideoTrack");

  const updateLocalMediaState = async () => {
    try {
      // Only sync RTM attributes - track state is handled by Controls.tsx
      // This syncs the mute state with other participants via RTM
      if (rtmChannel && localUID) {
        try {
          await RTM_CLIENT.setLocalUserAttributes({
            micMuted: audioMuted.toString(),
            videoMuted: videoMuted.toString(),
          });

          // Also send RTM message for immediate sync
          await rtmChannel.sendMessage({
            text: JSON.stringify({
              type: "media-state-updated",
              uid: localUID,
              micMuted: audioMuted,
              videoMuted: videoMuted,
            }),
          } as any);
        } catch (rtmError) {
          console.warn("Failed to sync media state via RTM:", rtmError);
        }
      }
    } catch (error) {
      console.error("Failed to update local media state:", error);
    }
  };

  useEffect(() => {
    updateLocalMediaState();
  }, [
    audioMuted,
    videoMuted,
    localUID,
    localAudioTrackZustand,
    localVideoTrackZustand,
  ]);

  useEffect(() => {
    // Log remote users for debugging
    console.log(
      "Remote users updated:",
      remoteUsers.length,
      remoteUsers.map((u) => u.uid)
    );

    // Ensure all remote video tracks are played
    remoteUsers.forEach((user) => {
      if (user.videoTrack) {
        const element = document.getElementById(`user-${user.uid}`);
        if (element && !user.videoTrack.isPlaying) {
          // play() may return undefined or a Promise, handle both cases
          const playResult = user.videoTrack.play(element);
          if (playResult && typeof playResult.catch === "function") {
            playResult.catch((error) => {
              console.error(
                `Failed to play video for user ${user.uid}:`,
                error
              );
            });
          }
        }
      }
    });
  }, [remoteUsers]);

  // --- 9. Return values from hook ---

  return {
    joinMeeting,
    leaveCall,
    localTracks: {
      audioTrack: localAudioTrackZustand,
      videoTrack: localVideoTrackZustand,
    },
    remoteUsers: remoteUsers,
    startScreenshare,
    stopScreenshare,
    isScreenSharing,
    rtmChannel, // Expose for whiteboard sync
  };
};
