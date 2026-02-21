// src/hooks/useAgora.ts
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalVideoTrack,
  ILocalAudioTrack,
} from "agora-rtc-sdk-ng";
import AgoraRTM from "agora-rtm-sdk";
import useAppStore from "@/store/useAppStore";
import { AGORA_CONFIG } from "@/api/agoraApi";
import { stopAgent } from "@/api/agentApi";
import { showToast } from "@/services/uiService";
import type { LocalAgoraTracks, HostControlMessage } from "@/types/agora";

// --- Initialize Agora RTC client as singleton (lazy to avoid SSR issues) ---
let RTC_CLIENT: IAgoraRTCClient | null = null;
const getRtcClient = (): IAgoraRTCClient => {
  if (!RTC_CLIENT && typeof window !== "undefined") {
    // Note: ENABLE_AUDIO_PTS_METADATA would improve word-by-word transcript sync
    // but is not yet in Web SDK MUTABLE_PARAMS - transcripts still work via RTM/RTC
    RTC_CLIENT = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  }
  return RTC_CLIENT!;
};

// RTM v2.x client - will be initialized per user (requires userId at construction)
let RTM_CLIENT: InstanceType<typeof AgoraRTM.RTM> | null = null;

// Current RTM channel name for pub/sub
let currentRtmChannelName: string | null = null;

// Module-scoped local tracks ref — shared across ALL useAgora() hook instances.
// Previously this was a useRef inside the hook, meaning each component that called
// useAgora() got its own empty ref. Only the instance that called joinMeeting had
// the actual tracks, so toggleLocalAudio/Video from Controls could never close them.
const localTracksRef: { current: LocalAgoraTracks } = {
  current: { audioTrack: null, videoTrack: null },
};

/**
 * Custom React Hook for managing all Agora RTC and RTM client-side logic.
 */
export const useAgora = () => {
  // --- 1. Zustand Selectors (at the top of the hook's body) ---
  const localUID = useAppStore((state) => state.localUID);
  const localUsername = useAppStore((state) => state.localUsername);
  const audioMuted = useAppStore((state) => state.audioMuted);
  const videoMuted = useAppStore((state) => state.videoMuted);
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
  const callEnd = useAppStore((state) => state.callEnd);
  const isAgentActive = useAppStore((state) => state.isAgentActive);
  const agentAvatarRtcUid = useAppStore((state) => state.agentAvatarRtcUid);

  // --- 2. Local React States (useState) and Refs (useRef) ---
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const remoteUsersRef = useRef<Record<string, IAgoraRTCRemoteUser>>({});
  // Track which remote users have been counted to prevent double counting
  const countedUsersRef = useRef<Set<string>>(new Set());

  // Dedicated avatar video track - tracked independently from remoteUsers to avoid
  // race conditions with the effect system that can wipe remoteUsers state.
  // This mirrors the pattern from the react-video-client-avatar sample where
  // remoteVideoTrack is a standalone state variable set directly from user-published.
  const [avatarVideoTrack, setAvatarVideoTrack] = useState<import("agora-rtc-sdk-ng").IRemoteVideoTrack | null>(null);
  const [avatarAudioTrack, setAvatarAudioTrack] = useState<import("agora-rtc-sdk-ng").IRemoteAudioTrack | null>(null);

  // localTracksRef is now module-scoped (see top of file) so all useAgora() instances share it

  // --- 3. Agora RTC/RTM Event Handlers (useCallback) ---

  const handleUserPublished = useCallback(
    async (
      user: IAgoraRTCRemoteUser,
      mediaType: "video" | "audio"
    ) => {
      console.log("User published:", user.uid, mediaType);
      const avatarUid = getAppStore.getState().agentAvatarRtcUid;
      if (avatarUid && String(user.uid) === avatarUid) {
        console.log("[Avatar] Remote stream published: uid", avatarUid, "mediaType:", mediaType);
      }

      try {
        // Subscribe to the user's tracks
        await getRtcClient().subscribe(user, mediaType);
        console.log("Successfully subscribed to user:", user.uid, mediaType);

        // IMPORTANT: Play audio track immediately after subscribing
        // Remote audio tracks must be explicitly played to be heard (e.g. agent TTS)
        if (mediaType === "audio" && user.audioTrack) {
          user.audioTrack.play();
          if (typeof user.audioTrack.setVolume === "function") {
            user.audioTrack.setVolume(100);
          }
          console.log("Playing audio track for user:", user.uid);
        }

        const userUidStr = String(user.uid);

        // Track avatar tracks independently (bypasses remoteUsers state race conditions)
        if (avatarUid && userUidStr === avatarUid) {
          if (mediaType === "video" && user.videoTrack) {
            console.log("[Avatar] Setting avatar video track for uid:", avatarUid);
            setAvatarVideoTrack(user.videoTrack);
          }
          if (mediaType === "audio" && user.audioTrack) {
            console.log("[Avatar] Setting avatar audio track for uid:", avatarUid);
            setAvatarAudioTrack(user.audioTrack);
          }
        }

        const shouldIncrementCount = !countedUsersRef.current.has(userUidStr);
        if (shouldIncrementCount) {
          countedUsersRef.current.add(userUidStr);
          increaseUserCount();
          console.log("Increased user count for user:", userUidStr, "via", mediaType);
        }

        if (mediaType === "video") {
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
        // Only set name if RTM has already provided it, otherwise let RTM set the real name later
        updateRemoteParticipant({
          uid: userUidStr,
          name: existingParticipant?.name,
          micMuted: !user.hasAudio,
          videoMuted: !user.hasVideo,
        });

        // Name will be updated via:
        // 1. RTM "user-joined" message (contains name)
        // 2. SNAPSHOT presence event (contains all users with their states)
      } catch (error) {
        console.error("Failed to subscribe to user:", error);
      }
    },
    [increaseUserCount, updateRemoteParticipant, getAppStore]
  );

  const handleUserUnpublished = useCallback(
    (user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
      console.log("User unpublished:", user.uid, mediaType);
      const userUidStr = String(user.uid);

      const avatarUid = getAppStore.getState().agentAvatarRtcUid;
      if (avatarUid && userUidStr === avatarUid) {
        if (mediaType === "video") setAvatarVideoTrack(null);
        if (mediaType === "audio") setAvatarAudioTrack(null);
      }

      if (mediaType === "video") {
        setRemoteUsers((prev) => {
          delete remoteUsersRef.current[userUidStr];
          return prev.filter((u) => String(u.uid) !== userUidStr);
        });
      }

      updateRemoteParticipant({
        uid: userUidStr,
        micMuted: mediaType === "audio" ? true : undefined,
        videoMuted: mediaType === "video" ? true : undefined,
      });
    },
    [updateRemoteParticipant]
  );

  const handleUserLeft = useCallback(
    (user: IAgoraRTCRemoteUser) => {
      console.log("User left:", user.uid);
      const userUidStr = String(user.uid);

      // Clear avatar tracks if this was the avatar user
      const avatarUid = getAppStore.getState().agentAvatarRtcUid;
      if (avatarUid && userUidStr === avatarUid) {
        setAvatarVideoTrack(null);
        setAvatarAudioTrack(null);
      }

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

      // Send RTM message about user leaving (v2.x uses publish)
      if (RTM_CLIENT && currentRtmChannelName) {
        RTM_CLIENT.publish(
          currentRtmChannelName,
          JSON.stringify({
            type: "user-left",
            uid: user.uid,
          })
        ).catch((error) => {
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

  // RTM v2.x message event handler
  interface RTMMessageEvent {
    channelType: string;
    channelName: string;
    topicName?: string;
    messageType: string;
    customType?: string;
    message: string | Uint8Array;
    publisher: string;
    timestamp: number;
  }

  const handleRTMMessageV2 = useCallback(
    (event: RTMMessageEvent) => {
      try {
        // v2.x: message is in event.message, publisher in event.publisher
        const messageText = typeof event.message === "string"
          ? event.message
          : new TextDecoder().decode(event.message);
        
        // Log raw message for debugging transcript issues
        console.log("[useAgora] RTM raw message:", messageText.substring(0, 200), "from:", event.publisher);
        
        // Try to parse - but chunked messages might not be valid JSON
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any;
        try {
          data = JSON.parse(messageText);
        } catch {
          // Could be a chunked transcript message (format: id|idx|sum|base64)
          console.log("[useAgora] RTM non-JSON message (possibly chunked):", messageText.substring(0, 100));
          return; // Let ConversationalAIAPI handle it
        }
        
        console.log("[useAgora] RTM v2.x message received - type:", data.type, "object:", data.object, "from:", event.publisher);
        
        // Transcript messages have 'object' field, not 'type' - let ConversationalAIAPI handle those
        if (data.object && !data.type) {
          console.log("[useAgora] Transcript message detected, skipping (handled by ConversationalAIAPI):", data.object);
          return;
        }

        switch (data.type) {
          case "user-joined": {
            // Validate uid exists
            if (!data.uid) {
              console.error("RTM user-joined message missing uid:", data);
              break;
            }

            const joinedUid = String(data.uid);

            // Skip processing our own user-joined message
            const currentLocalUID = getAppStore.getState().localUID;
            if (currentLocalUID && joinedUid === String(currentLocalUID)) {
              console.log("Skipping own user-joined RTM message for uid:", joinedUid);
              break;
            }

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
              const remoteUsersList = getRtcClient().remoteUsers;
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

                  // Also increment user count if not already counted
                  if (!countedUsersRef.current.has(joinedUid)) {
                    countedUsersRef.current.add(joinedUid);
                    increaseUserCount();
                    console.log("Increased user count for user added via RTM:", joinedUid);
                  }

                  return [...prev, existingUser];
                });
              }
            }, 1000); // Give RTC some time to process
            break;
          }

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

          case "host-mute-request":
            // Host is requesting to mute this user's media
            {
              const hostMuteState = getAppStore.getState();
              if (data.targetUid === String(hostMuteState.localUID)) {
                console.log("Processing host mute request:", data);
                showToast(
                  `${data.fromName} (Host) muted your ${data.mediaType}`,
                  "info"
                );

                // Mute the appropriate track(s) and broadcast state
                (async () => {
                  try {
                    if (data.mediaType === "audio" || data.mediaType === "both") {
                      const audioTrack = localTracksRef.current.audioTrack;
                      if (audioTrack && !hostMuteState.audioMuted) {
                        try { await getRtcClient().unpublish(audioTrack); }
                        catch (e) { console.warn("Host mute unpublish audio:", e); }
                        try { audioTrack.getMediaStreamTrack()?.stop(); } catch { /* noop */ }
                        audioTrack.stop();
                        audioTrack.close();
                        localTracksRef.current.audioTrack = null;
                        getAppStore.getState().setLocalTracks(null, getAppStore.getState().localVideoTrack);
                        hostMuteState.toggleAudioMute();
                      }
                    }

                    if (data.mediaType === "video" || data.mediaType === "both") {
                      const videoTrack = localTracksRef.current.videoTrack;
                      if (videoTrack && !hostMuteState.videoMuted) {
                        try { await getRtcClient().unpublish(videoTrack); }
                        catch (e) { console.warn("Host mute unpublish video:", e); }
                        try { videoTrack.getMediaStreamTrack()?.stop(); } catch { /* noop */ }
                        videoTrack.stop();
                        videoTrack.close();
                        localTracksRef.current.videoTrack = null;
                        getAppStore.getState().setLocalTracks(getAppStore.getState().localAudioTrack, null);
                        hostMuteState.toggleVideoMute();
                      }
                    }

                    // Broadcast updated state to all participants
                    if (RTM_CLIENT && currentRtmChannelName) {
                      const updatedState = getAppStore.getState();
                      await RTM_CLIENT.publish(
                        currentRtmChannelName,
                        JSON.stringify({
                          type: "media-state-updated",
                          uid: updatedState.localUID,
                          micMuted: updatedState.audioMuted,
                          videoMuted: updatedState.videoMuted,
                        })
                      );
                      await RTM_CLIENT.presence.setState(currentRtmChannelName, "MESSAGE", {
                        micMuted: updatedState.audioMuted.toString(),
                        videoMuted: updatedState.videoMuted.toString(),
                      });
                    }
                  } catch (error) {
                    console.error("Failed to process mute request:", error);
                  }
                })();
              }
            }
            break;

          case "host-unmute-request":
            // Host is requesting to unmute - show consent modal
            {
              const hostUnmuteState = getAppStore.getState();
              if (data.targetUid === String(hostUnmuteState.localUID)) {
                console.log("Processing host unmute request:", data);
                hostUnmuteState.setPendingUnmuteRequest({
                  fromUid: data.fromUid,
                  fromName: data.fromName,
                  mediaType: data.mediaType,
                  timestamp: data.timestamp,
                });
              }
            }
            break;

          default:
            console.log("Unknown RTM message type:", data.type);
        }
      } catch (error) {
        console.error("Failed to parse RTM message:", error);
      }
    },
    [updateRemoteParticipant, getAppStore, increaseUserCount]
  );

  // --- 3.5 Host Control Functions ---

  /**
   * Sends a mute/unmute request to a specific user via RTM User Channel
   */
  const sendHostControlRequest = useCallback(
    async (
      targetUid: string,
      action: "mute" | "unmute",
      mediaType: "audio" | "video" | "both"
    ): Promise<boolean> => {
      if (!RTM_CLIENT) {
        showToast("RTM not connected", "error");
        return false;
      }

      const currentState = getAppStore.getState();
      if (!currentState.isHost) {
        showToast("Only hosts can mute/unmute participants", "error");
        return false;
      }

      const message: HostControlMessage = {
        type: action === "mute" ? "host-mute-request" : "host-unmute-request",
        fromUid: String(currentState.localUID),
        fromName: currentState.localUsername,
        targetUid: targetUid,
        mediaType: mediaType,
        timestamp: Date.now(),
      };

      try {
        // RTM v2.x: Publish to User Channel (private message to specific user)
        await RTM_CLIENT.publish(targetUid, JSON.stringify(message));
        console.log(`Host control request sent to ${targetUid}:`, message);

        // Only show toast for unmute requests (mute auto-applies silently)
        if (action === "unmute") {
          showToast("Unmute request sent", "info");
        }
        return true;
      } catch (error) {
        console.error("Failed to send host control request:", error);
        showToast("Failed to send control request", "error");
        return false;
      }
    },
    [getAppStore]
  );

  /**
   * User accepts the unmute request and enables their media
   */
  const acceptUnmuteRequest = useCallback(async () => {
    const currentState = getAppStore.getState();
    const request = currentState.pendingUnmuteRequest;

    if (!request) return;

    try {
      // Create fresh track(s) and publish them (previous tracks were closed on mute)
      if (request.mediaType === "audio" || request.mediaType === "both") {
        if (currentState.audioMuted) {
          const microphoneId = currentState.selectedMicrophoneId;
          const config = microphoneId ? { microphoneId } : undefined;
          const newAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(config);
          localTracksRef.current.audioTrack = newAudioTrack;
          getAppStore.getState().setLocalTracks(newAudioTrack, getAppStore.getState().localVideoTrack);
          try { await getRtcClient().publish(newAudioTrack); }
          catch (e) { console.warn("Accept unmute publish audio:", e); }
          currentState.toggleAudioMute();
        }
      }

      if (request.mediaType === "video" || request.mediaType === "both") {
        if (currentState.videoMuted) {
          const newVideoTrack = await AgoraRTC.createCameraVideoTrack();
          localTracksRef.current.videoTrack = newVideoTrack;
          getAppStore.getState().setLocalTracks(getAppStore.getState().localAudioTrack, newVideoTrack);
          try { await getRtcClient().publish(newVideoTrack); }
          catch (e) { console.warn("Accept unmute publish video:", e); }
          currentState.toggleVideoMute();
        }
      }

      // Broadcast updated state
      if (RTM_CLIENT && currentRtmChannelName) {
        const newAudioMuted =
          request.mediaType === "audio" || request.mediaType === "both"
            ? false
            : currentState.audioMuted;
        const newVideoMuted =
          request.mediaType === "video" || request.mediaType === "both"
            ? false
            : currentState.videoMuted;

        await RTM_CLIENT.publish(
          currentRtmChannelName,
          JSON.stringify({
            type: "media-state-updated",
            uid: currentState.localUID,
            micMuted: newAudioMuted,
            videoMuted: newVideoMuted,
          })
        );

        // Update presence for late joiners
        await RTM_CLIENT.presence.setState(currentRtmChannelName, "MESSAGE", {
          micMuted: newAudioMuted.toString(),
          videoMuted: newVideoMuted.toString(),
        });
      }

      showToast("Media enabled", "success");
    } catch (error) {
      console.error("Failed to accept unmute request:", error);
      showToast("Failed to enable media", "error");
    } finally {
      currentState.clearPendingUnmuteRequest();
    }
  }, [getAppStore]);

  /**
   * User declines the unmute request
   */
  const declineUnmuteRequest = useCallback(() => {
    const currentState = getAppStore.getState();
    currentState.clearPendingUnmuteRequest();
    showToast("Unmute request declined", "info");
  }, [getAppStore]);

  // --- 4. Core Agora SDK Utility Functions (useCallback) ---

  const createLocalTracks = useCallback(async (selectedMicrophoneId?: string): Promise<LocalAgoraTracks> => {
    // Get selected microphone ID from store if not provided
    const microphoneId = selectedMicrophoneId || getAppStore.getState().selectedMicrophoneId;

    // Create audio track with optional device selection
    const audioTrackConfig = microphoneId ? { microphoneId } : undefined;
    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack(audioTrackConfig);
    const videoTrack = await AgoraRTC.createCameraVideoTrack();

    setLocalTracksZustand(audioTrack, videoTrack); // Store tracks in Zustand
    localTracksRef.current = { audioTrack, videoTrack }; // Also update ref for immediate use within hook
    return { audioTrack, videoTrack };
  }, [setLocalTracksZustand, getAppStore]); // Dependency: setLocalTracksZustand action, getAppStore

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
        // RTM v2.x: Create client with appId and userId
        RTM_CLIENT = new AgoraRTM.RTM(AGORA_CONFIG.APP_ID!, uid, {
          useStringUserId: true,
        });

        // Store channel name for pub/sub
        currentRtmChannelName = channelId;

        // Step 1: Set up event listeners BEFORE login (v2.x pattern)
        RTM_CLIENT.addEventListener("message", (event) => {
          // v2.x message event structure
          handleRTMMessageV2(event);
        });

        RTM_CLIENT.addEventListener("presence", async (event) => {
          console.log("RTM Presence event:", event.eventType, event);

          if (event.eventType === "SNAPSHOT") {
            // SNAPSHOT fires when joining a channel - contains all current users with their states
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const snapshot = (event as any).snapshot as Array<{
              userId: string;
              states: Record<string, string>;
            }> | undefined;

            console.log("Processing SNAPSHOT with users:", snapshot);

            if (snapshot && Array.isArray(snapshot)) {
              snapshot.forEach((user) => {
                // Skip local user
                if (user.userId === uid) return;

                if (user.states?.name) {
                  console.log("Found user in SNAPSHOT:", user.userId, user.states.name);
                  updateRemoteParticipant({
                    uid: user.userId,
                    name: user.states.name,
                    micMuted: user.states.micMuted === "true",
                    videoMuted: user.states.videoMuted === "true",
                  });
                }
              });
            }
          } else if (event.eventType === "REMOTE_JOIN") {
            console.log("RTM Member joined:", event.publisher);
            // User name will be received via RTM "user-joined" message
            // No need to call getState() here as it doesn't work with MESSAGE channel type
          } else if (event.eventType === "REMOTE_LEAVE") {
            console.log("RTM Member left:", event.publisher);
          } else if (event.eventType === "REMOTE_STATE_CHANGED") {
            // Handle user state/attributes changes
            if (event.publisher && event.stateChanged) {
              // stateChanged in RTM v2.x is a plain object like {name: "sdfsdf", micMuted: "false", ...}
              const stateChanged = event.stateChanged as Record<string, string>;
              console.log("Processing REMOTE_STATE_CHANGED for:", event.publisher, stateChanged);

              // Directly update participant with the state object
              if (stateChanged.name || stateChanged.micMuted !== undefined || stateChanged.videoMuted !== undefined) {
                updateRemoteParticipant({
                  uid: event.publisher,
                  name: stateChanged.name,
                  micMuted: stateChanged.micMuted === "true",
                  videoMuted: stateChanged.videoMuted === "true",
                });
                console.log("Updated remote participant from REMOTE_STATE_CHANGED:", event.publisher, stateChanged.name);
              }
            }
          }
        });

        RTM_CLIENT.addEventListener("status", (event) => {
          console.log("RTM Status:", event.state, event.reason);
        });

        // Step 2: Login to RTM with token (v2.x pattern)
        await RTM_CLIENT.login({ token });

        // Step 3: Subscribe to channel with presence enabled
        await RTM_CLIENT.subscribe(channelId, {
          withMessage: true,
          withPresence: true,
          withMetadata: false,
          withLock: false,
        });

        // Step 4: Set initial user state using presence (replaces setLocalUserAttributes)
        await RTM_CLIENT.presence.setState(channelId, "MESSAGE", {
          name: localUsername,
          micMuted: audioMutedState.toString(),
          videoMuted: videoMutedState.toString(),
        });

        console.log("RTM v2.x initialized successfully for channel:", channelId);
      } catch (error) {
        console.error("Failed to initialize RTM:", error);
        showToast("Failed to initialize RTM. Please try again.", "error");
        throw error;
      }
    },
    [handleRemoteUserAttributesUpdated, handleRTMMessageV2]
  ); // Dependencies for initializeAgoraRTM

  // --- 5. Internal Cleanup Helper (MUST BE DEFINED BEFORE joinMeeting/leaveCall) ---

  const _cleanupAgoraResources = useCallback(
    async (
      currentLocalAudioTrack: ILocalAudioTrack | null,
      currentLocalVideoTrack: ILocalVideoTrack | null,
      callEndAction: () => void
    ) => {
      if (currentLocalAudioTrack) {
        currentLocalAudioTrack.close();
      }
      if (currentLocalVideoTrack) {
        currentLocalVideoTrack.close();
      }
      if (RTC_CLIENT && getRtcClient().connectionState === "CONNECTED") {
        await getRtcClient().leave();
      }
      // RTM v2.x cleanup: unsubscribe and logout
      if (RTM_CLIENT) {
        try {
          if (currentRtmChannelName) {
            await RTM_CLIENT.unsubscribe(currentRtmChannelName);
            currentRtmChannelName = null;
          }
          RTM_CLIENT.removeAllListeners();
          await RTM_CLIENT.logout();
          RTM_CLIENT = null;
        } catch (rtmError) {
          console.warn("Error during RTM cleanup:", rtmError);
        }
      }
      showToast("Resources cleaned up.", "info");
      callEndAction();
    },
    []
  ); // No dependencies from useAgora scope, all passed as args or module-level

  // --- 7. Exposed Call Control Functions (MUST BE DEFINED AFTER cleanup helper) ---

  const leaveCall = useCallback(async () => {
    // Stop AI agent and clear uploads so next session is fresh (call end / timer / logout)
    const state = getAppStore.getState();
    if (state.agentId) {
      try {
        await stopAgent(state.agentId);
      } catch (err) {
        console.warn("Stop agent on leave:", err);
      }
      state.clearAgent();
    }
    try {
      await fetch("/api/upload/clear", { method: "POST" });
    } catch (err) {
      console.warn("Clear uploads on leave:", err);
    }

    await _cleanupAgoraResources(
      localAudioTrackZustand, // Use tracks from Zustand state
      localVideoTrackZustand,
      callEnd
    );
  }, [
    _cleanupAgoraResources,
    localAudioTrackZustand,
    localVideoTrackZustand,
    callEnd,
  ]);

  const joinMeeting = useCallback(
    async (
      rtcToken: string,
      rtmToken: string,
      uid: number,
      channelId: string,
      meetingName: string,
      userName?: string
    ) => {
      try {
        // Clean up any existing connections before joining
        if (
          RTC_CLIENT &&
          (getRtcClient().connectionState === "CONNECTING" ||
            getRtcClient().connectionState === "CONNECTED")
        ) {
          console.log("RTC client already connected, leaving first...");
          try {
            await getRtcClient().leave();
          } catch (leaveError) {
            console.warn("Error leaving existing RTC connection:", leaveError);
          }
        }

        // Clean up RTM v2.x if already connected
        if (RTM_CLIENT) {
          try {
            // Unsubscribe from channel if subscribed
            if (currentRtmChannelName) {
              await RTM_CLIENT.unsubscribe(currentRtmChannelName);
              currentRtmChannelName = null;
            }
            RTM_CLIENT.removeAllListeners();
            await RTM_CLIENT.logout();
            RTM_CLIENT = null;
          } catch (rtmLogoutError: unknown) {
            // Ignore errors if not logged in
            const error = rtmLogoutError as { code?: string };
            if (error?.code !== "RTM_ERROR_NOT_LOGIN") {
              console.warn("Error cleaning up RTM client:", rtmLogoutError);
            }
          }
        }

        // Reset remote users state, avatar tracks, and counted users
        setRemoteUsers([]);
        setAvatarVideoTrack(null);
        setAvatarAudioTrack(null);
        remoteUsersRef.current = {};
        countedUsersRef.current.clear();

        const { audioTrack, videoTrack } = await createLocalTracks();
        if (!audioTrack || !videoTrack) {
          throw new Error("Failed to create local tracks.");
        }

        // If the user is joining with audio/video muted, immediately close the
        // tracks we just created so Chrome fully releases the hardware.
        // The toggle functions will recreate them when the user unmutes.
        if (audioMuted) {
          try { audioTrack.getMediaStreamTrack()?.stop(); } catch { /* noop */ }
          audioTrack.stop();
          audioTrack.close();
          localTracksRef.current.audioTrack = null;
          getAppStore.getState().setLocalTracks(null, videoMuted ? null : videoTrack);
        }
        if (videoMuted) {
          try { videoTrack.getMediaStreamTrack()?.stop(); } catch { /* noop */ }
          videoTrack.stop();
          videoTrack.close();
          localTracksRef.current.videoTrack = null;
          getAppStore.getState().setLocalTracks(
            audioMuted ? null : localTracksRef.current.audioTrack,
            null
          );
        }

        await getRtcClient().join(
          AGORA_CONFIG.APP_ID!,
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
        // Only publish tracks that are not muted. Muted tracks were closed above
        // and will be recreated + published when the user unmutes.
        const tracksToPublish: (ILocalAudioTrack | ILocalVideoTrack)[] = [];
        if (!audioMuted && localTracksRef.current.audioTrack) tracksToPublish.push(localTracksRef.current.audioTrack);
        if (!videoMuted && localTracksRef.current.videoTrack) tracksToPublish.push(localTracksRef.current.videoTrack);
        if (tracksToPublish.length > 0) {
          await getRtcClient().publish(tracksToPublish);
        }

        // Local user count is now set in callStart() - don't double count here

        // Send RTM message to notify other users (v2.x uses publish)
        if (RTM_CLIENT && currentRtmChannelName) {
          await RTM_CLIENT.publish(
            currentRtmChannelName,
            JSON.stringify({
              type: "user-joined",
              uid: uid,
              name: userName || `User ${uid}`,
              micMuted: audioMuted,
              videoMuted: videoMuted,
            })
          );
        }

        showToast("Joined meeting successfully!", "success");
      } catch (error) {
        console.error("Failed to join meeting:", error);
        showToast("Failed to join meeting. Please try again.", "error");
        await _cleanupAgoraResources(
          getAppStore.getState().localAudioTrack,
          getAppStore.getState().localVideoTrack,
          getAppStore.getState().callEnd
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
      initializeAgoraRTM,
      updateRemoteParticipant,
    ]
  );

  // --- 8. useEffect hooks (after all handlers/functions they depend on) ---

  useEffect(() => {
    // Remove ALL existing listeners first to prevent duplicates
    getRtcClient().removeAllListeners("user-published");
    getRtcClient().removeAllListeners("user-unpublished");
    getRtcClient().removeAllListeners("user-left");

    // Set up RTC event listeners
    getRtcClient().on("user-published", handleUserPublished);
    getRtcClient().on("user-unpublished", handleUserUnpublished);
    getRtcClient().on("user-left", handleUserLeft);

    // Sync existing remote users from RTC_CLIENT into local state
    // This handles the case where users published before this hook instance mounted.
    // Merge by uid: add any client user not already in prev (do not use ref to decide;
    // otherwise we can overwrite prev with [] when ref was set by handleUserPublished before state flushed).
    if (getRtcClient().connectionState === "CONNECTED") {
      const existingRemoteUsers = getRtcClient().remoteUsers;
      if (existingRemoteUsers.length > 0) {
        setRemoteUsers((prev) => {
          const newUsers = [...prev];
          existingRemoteUsers.forEach((user) => {
            const uidStr = String(user.uid);
            const inPrev = newUsers.some((u) => String(u.uid) === uidStr);
            if (!inPrev) {
              remoteUsersRef.current[uidStr] = user;
              newUsers.push(user);
            } else {
              remoteUsersRef.current[uidStr] = user;
            }
          });
          return newUsers;
        });
      }
    }

    return () => {
      // Cleanup listeners on unmount
      getRtcClient().removeAllListeners("user-published");
      getRtcClient().removeAllListeners("user-unpublished");
      getRtcClient().removeAllListeners("user-left");
    };
  }, [handleUserPublished, handleUserUnpublished, handleUserLeft]);

  // When agent is active, proactively ensure all remote users' audio is played (agent TTS may publish after join; catch missed or late user-published)
  useEffect(() => {
    if (!isAgentActive) return;
    const client = getRtcClient();
    if (client.connectionState !== "CONNECTED") return;
    const interval = setInterval(() => {
      const remotes = client.remoteUsers;
      remotes.forEach((user) => {
        const track = user.audioTrack;
        if (track) {
          if (!track.isPlaying) {
            track.play();
            if (typeof track.setVolume === "function") track.setVolume(100);
            console.log("[useAgora] Proactively playing remote audio for user:", user.uid);
          }
        }
      });
    }, 2000);
    const timeout = setTimeout(() => clearInterval(interval), 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isAgentActive]);

  // --- Single effect: clear then retroactively capture avatar tracks ---
  // Always clear first (handles stop/disable/reinvite). If avatar is enabled, then retroactively
  // capture tracks so we don't have a second effect wiping them.
  useEffect(() => {
    setAvatarVideoTrack(null);
    setAvatarAudioTrack(null);

    if (!agentAvatarRtcUid) return;

    console.log("[Avatar] agentAvatarRtcUid set to:", agentAvatarRtcUid, "- checking for existing remote user tracks");

    const checkAndCapture = () => {
      try {
        const client = getRtcClient();
        if (client.connectionState !== "CONNECTED") return false;

        const avatarUser = client.remoteUsers.find(
          (u) => String(u.uid) === agentAvatarRtcUid
        );

        if (!avatarUser) {
          console.log("[Avatar] User", agentAvatarRtcUid, "not yet in remoteUsers, will retry");
          return false;
        }

        let captured = false;
        if (avatarUser.videoTrack) {
          console.log("[Avatar] Retroactively captured video track for uid:", agentAvatarRtcUid);
          setAvatarVideoTrack(avatarUser.videoTrack);
          captured = true;
        }
        if (avatarUser.audioTrack) {
          console.log("[Avatar] Retroactively captured audio track for uid:", agentAvatarRtcUid);
          setAvatarAudioTrack(avatarUser.audioTrack);
          if (!avatarUser.audioTrack.isPlaying) {
            avatarUser.audioTrack.play();
            if (typeof avatarUser.audioTrack.setVolume === "function") {
              avatarUser.audioTrack.setVolume(100);
            }
          }
          captured = true;
        }
        return captured;
      } catch {
        return false;
      }
    };

    if (checkAndCapture()) return;

    const interval = setInterval(() => {
      if (checkAndCapture()) {
        clearInterval(interval);
      }
    }, 500);

    const timeout = setTimeout(() => clearInterval(interval), 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [agentAvatarRtcUid]);

  const updateLocalMediaState = async () => {
    try {
      // Only sync RTM attributes - track state is handled by Controls.tsx
      // This syncs the mute state with other participants via RTM v2.x
      if (RTM_CLIENT && currentRtmChannelName && localUID) {
        try {
          // v2.x: Use presence.setState instead of setLocalUserAttributes
          await RTM_CLIENT.presence.setState(currentRtmChannelName, "MESSAGE", {
            micMuted: audioMuted.toString(),
            videoMuted: videoMuted.toString(),
          });

          // Also send RTM message for immediate sync (v2.x uses publish)
          await RTM_CLIENT.publish(
            currentRtmChannelName,
            JSON.stringify({
              type: "media-state-updated",
              uid: localUID,
              micMuted: audioMuted,
              videoMuted: videoMuted,
            })
          );
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
          try {
            user.videoTrack.play(element);
          } catch (error) {
            console.error(`Failed to play video for user ${user.uid}:`, error);
          }
        }
      }
    });
  }, [remoteUsers]);

  // --- 9. Toggle local audio/video using the track ref (correct ILocalTrack type) ---

  const toggleLocalAudio = useCallback(async () => {
    try {
      const currentlyMuted = getAppStore.getState().audioMuted;
      if (currentlyMuted) {
        // Unmuting: create a fresh audio track, store it, and publish
        const microphoneId = getAppStore.getState().selectedMicrophoneId;
        const config = microphoneId ? { microphoneId } : undefined;
        const newTrack = await AgoraRTC.createMicrophoneAudioTrack(config);
        localTracksRef.current.audioTrack = newTrack;
        getAppStore.getState().setLocalTracks(newTrack, getAppStore.getState().localVideoTrack);
        try { await getRtcClient().publish(newTrack); }
        catch (e) { console.warn("Audio publish after unmute:", e); }
      } else {
        // Muting: unpublish, then close the track to fully release the mic hardware
        const track = localTracksRef.current.audioTrack;
        if (track) {
          try { await getRtcClient().unpublish(track); }
          catch (e) { console.warn("Audio unpublish on mute:", e); }
          // Stop the native browser MediaStreamTrack directly — guaranteed to release mic
          try { track.getMediaStreamTrack()?.stop(); } catch { /* already stopped */ }
          track.stop();
          track.close();
          localTracksRef.current.audioTrack = null;
          getAppStore.getState().setLocalTracks(null, getAppStore.getState().localVideoTrack);
        }
      }
      getAppStore.getState().toggleAudioMute();
    } catch (error) {
      console.error("Failed to toggle audio:", error);
      showToast("Failed to toggle microphone", "error");
    }
  }, [getAppStore]);

  const toggleLocalVideo = useCallback(async () => {
    try {
      const currentlyMuted = getAppStore.getState().videoMuted;
      if (currentlyMuted) {
        // Unmuting: create a fresh video track, store it, and publish
        const newTrack = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.videoTrack = newTrack;
        getAppStore.getState().setLocalTracks(getAppStore.getState().localAudioTrack, newTrack);
        try { await getRtcClient().publish(newTrack); }
        catch (e) { console.warn("Video publish after unmute:", e); }
      } else {
        // Muting: unpublish, then close the track to fully release the camera hardware
        const track = localTracksRef.current.videoTrack;
        if (track) {
          try { await getRtcClient().unpublish(track); }
          catch (e) { console.warn("Video unpublish on mute:", e); }
          // Stop the native browser MediaStreamTrack directly — guaranteed to release camera
          try { track.getMediaStreamTrack()?.stop(); } catch { /* already stopped */ }
          track.stop();
          track.close();
          localTracksRef.current.videoTrack = null;
          getAppStore.getState().setLocalTracks(getAppStore.getState().localAudioTrack, null);
        }
      }
      getAppStore.getState().toggleVideoMute();
    } catch (error) {
      console.error("Failed to toggle video:", error);
      showToast("Failed to toggle camera", "error");
    }
  }, [getAppStore]);

  // Helper function to publish RTM messages (for whiteboard sync, etc.)
  const publishRtmMessage = useCallback(async (message: string) => {
    if (RTM_CLIENT && currentRtmChannelName) {
      await RTM_CLIENT.publish(currentRtmChannelName, message);
    }
  }, []);

  return {
    joinMeeting,
    leaveCall,
    localTracks: {
      audioTrack: localAudioTrackZustand,
      videoTrack: localVideoTrackZustand,
    },
    remoteUsers: remoteUsers,
    // Avatar tracks tracked independently from remoteUsers (like the react-video-client-avatar sample)
    avatarVideoTrack,
    avatarAudioTrack,
    publishRtmMessage,
    // Host control functions
    sendHostControlRequest,
    acceptUnmuteRequest,
    declineUnmuteRequest,
    // Local mute toggles (use track ref with correct type)
    toggleLocalAudio,
    toggleLocalVideo,
    // Expose clients for conversational AI integration
    rtcClient: getRtcClient(),
    rtmClient: RTM_CLIENT,
  };
};
