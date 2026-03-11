// src/hooks/podcast/usePodcastRTC.ts
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from "agora-rtc-sdk-ng";
import { AGORA_CONFIG } from "@/api/agoraApi";

interface UsePodcastRTCOptions {
  hostRtcUid: number;
  guestRtcUid: number;
  hostAvatarUid: number;
  guestAvatarUid: number;
}

export const usePodcastRTC = (options: UsePodcastRTCOptions) => {
  const { hostRtcUid, guestRtcUid, hostAvatarUid, guestAvatarUid } = options;

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const [hostVideoTrack, setHostVideoTrack] = useState<IRemoteVideoTrack | null>(null);
  const [guestVideoTrack, setGuestVideoTrack] = useState<IRemoteVideoTrack | null>(null);
  const [hostAudioPlaying, setHostAudioPlaying] = useState(false);
  const [guestAudioPlaying, setGuestAudioPlaying] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  const joinAsAudience = useCallback(
    async (token: string, uid: number, channel: string) => {
      if (clientRef.current) return;

      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;

      // Set as audience with low-latency so we can subscribe to audio/video
      await client.setClientRole("audience", { level: 1 });

      // Debug: log when any remote user joins/leaves the channel
      client.on("user-joined", (user: IAgoraRTCRemoteUser) => {
        console.log(`[PodcastRTC] user-joined: uid=${user.uid}, hasAudio=${user.hasAudio}, hasVideo=${user.hasVideo}`);
        console.log(`[PodcastRTC] Expected avatar UIDs: host=${hostAvatarUid}, guest=${guestAvatarUid}`);
      });

      // Handle remote user published tracks
      client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
        console.log(`[PodcastRTC] user-published: uid=${user.uid}, mediaType=${mediaType}, hasVideo=${user.hasVideo}, hasAudio=${user.hasAudio}`);
        await client.subscribe(user, mediaType);
        const userUid = Number(user.uid);

        if (mediaType === "video") {
          const track = user.videoTrack as IRemoteVideoTrack;
          if (userUid === hostAvatarUid) {
            setHostVideoTrack(track);
          } else if (userUid === guestAvatarUid) {
            setGuestVideoTrack(track);
          }
        }

        if (mediaType === "audio" && user.audioTrack) {
          const track = user.audioTrack as IRemoteAudioTrack;
          console.log(`[PodcastRTC] Playing audio from uid=${userUid}`);
          track.play();
          if (typeof track.setVolume === "function") {
            track.setVolume(100);
          }
          console.log(`[PodcastRTC] Audio track playing for uid=${userUid}, volume set to 100`);
          if (userUid === hostRtcUid || userUid === hostAvatarUid) {
            setHostAudioPlaying(true);
          } else if (userUid === guestRtcUid || userUid === guestAvatarUid) {
            setGuestAudioPlaying(true);
          }
        }
      });

      client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
        const userUid = Number(user.uid);
        if (mediaType === "video") {
          if (userUid === hostAvatarUid) setHostVideoTrack(null);
          else if (userUid === guestAvatarUid) setGuestVideoTrack(null);
        }
        if (mediaType === "audio") {
          if (userUid === hostRtcUid || userUid === hostAvatarUid) setHostAudioPlaying(false);
          else if (userUid === guestRtcUid || userUid === guestAvatarUid) setGuestAudioPlaying(false);
        }
      });

      await client.join(AGORA_CONFIG.APP_ID!, channel, token, uid);
      setIsJoined(true);
      console.log("[PodcastRTC] Joined as audience, uid:", uid, "channel:", channel);
      console.log("[PodcastRTC] Remote users after join:", client.remoteUsers.map(u => ({
        uid: u.uid, hasAudio: u.hasAudio, hasVideo: u.hasVideo,
      })));
    },
    [hostRtcUid, guestRtcUid, hostAvatarUid, guestAvatarUid],
  );

  const leaveChannel = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    client.removeAllListeners();
    await client.leave();
    clientRef.current = null;
    setIsJoined(false);
    setHostVideoTrack(null);
    setGuestVideoTrack(null);
    setHostAudioPlaying(false);
    setGuestAudioPlaying(false);
    console.log("[PodcastRTC] Left channel");
  }, []);

  // Proactively poll for remote audio tracks that may arrive after join.
  // Agents may publish audio late (after TTS starts) — this catches missed user-published events.
  useEffect(() => {
    if (!isJoined) return;

    const interval = setInterval(async () => {
      const client = clientRef.current;
      if (!client) return;

      for (const user of client.remoteUsers) {
        const userUid = Number(user.uid);

        // Try to subscribe to any unsubscribed video tracks (avatar UIDs)
        if (user.hasVideo && !user.videoTrack) {
          try {
            await client.subscribe(user, "video");
            console.log(`[PodcastRTC] Proactive subscribe video: uid=${user.uid}`);
          } catch {
            // May fail if already subscribing
          }
        }

        // Set video tracks for avatar UIDs
        if (user.videoTrack) {
          if (userUid === hostAvatarUid) {
            setHostVideoTrack((prev) => prev ?? (user.videoTrack as IRemoteVideoTrack));
          } else if (userUid === guestAvatarUid) {
            setGuestVideoTrack((prev) => prev ?? (user.videoTrack as IRemoteVideoTrack));
          }
        }

        // Try to subscribe to any unsubscribed audio tracks
        if (user.hasAudio && !user.audioTrack) {
          try {
            await client.subscribe(user, "audio");
            console.log(`[PodcastRTC] Proactive subscribe audio: uid=${user.uid}`);
          } catch {
            // May fail if already subscribing
          }
        }

        // Play any audio tracks that exist but aren't playing
        const track = user.audioTrack;
        if (track && !track.isPlaying) {
          track.play();
          if (typeof track.setVolume === "function") {
            track.setVolume(100);
          }
          console.log(`[PodcastRTC] Proactive play audio: uid=${userUid}`);
          if (userUid === hostRtcUid || userUid === hostAvatarUid) {
            setHostAudioPlaying(true);
          } else if (userUid === guestRtcUid || userUid === guestAvatarUid) {
            setGuestAudioPlaying(true);
          }
        }
      }
    }, 2000);

    // Keep polling for the duration of the podcast (no 30s cutoff like 1-on-1)
    return () => clearInterval(interval);
  }, [isJoined, hostRtcUid, guestRtcUid, hostAvatarUid, guestAvatarUid]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        clientRef.current.leave().catch(() => {});
        clientRef.current = null;
      }
    };
  }, []);

  return {
    rtcClient: clientRef.current,
    joinAsAudience,
    leaveChannel,
    hostVideoTrack,
    guestVideoTrack,
    hostAudioPlaying,
    guestAudioPlaying,
    isJoined,
  };
};
