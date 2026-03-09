// src/hooks/podcast/usePodcastRTM.ts
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import AgoraRTM from "agora-rtm-sdk";
import { AGORA_CONFIG } from "@/api/agoraApi";
import usePodcastStore from "@/store/usePodcastStore";
import type { AudienceMessage } from "@/types/podcast";
import { ConversationalAIAPI, EChatMessageType } from "@/conversational-ai-api";

interface UsePodcastRTMOptions {
  hostRtcUid: number;
}

export const usePodcastRTM = (options: UsePodcastRTMOptions) => {
  const { hostRtcUid } = options;

  const rtmClientRef = useRef<InstanceType<typeof AgoraRTM.RTM> | null>(null);
  const channelRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const lastSendRef = useRef<number>(0);

  const addAudienceMessage = usePodcastStore((s) => s.addAudienceMessage);

  const joinRTM = useCallback(
    async (token: string, uid: number, channel: string) => {
      if (rtmClientRef.current) return;

      const rtm = new AgoraRTM.RTM(AGORA_CONFIG.APP_ID!, String(uid), {
        useStringUserId: true,
      });
      rtmClientRef.current = rtm;
      channelRef.current = channel;

      // Listen for channel messages
      rtm.addEventListener("message", (event: unknown) => {
        try {
          const e = event as {
            message?: string | Uint8Array;
            publisher?: string;
            channelName?: string;
            customType?: string;
          };
          if (!e.message || e.channelName !== channel) return;
          // Only handle audience chat messages (not transcript data)
          if (e.customType !== "AUDIENCE_CHAT") return;

          const data =
            typeof e.message === "string"
              ? JSON.parse(e.message)
              : JSON.parse(new TextDecoder().decode(e.message as Uint8Array));

          const msg: AudienceMessage = {
            id: data.id || `${Date.now()}-${Math.random()}`,
            userId: e.publisher || "unknown",
            displayName: data.displayName || "Audience",
            text: data.text || "",
            timestamp: data.timestamp || Date.now(),
            isQuestion: data.isQuestion || false,
          };
          addAudienceMessage(msg);
        } catch {
          // Ignore non-chat messages
        }
      });

      await rtm.login({ token });
      await rtm.subscribe(channel);
      setIsConnected(true);
      console.log("[PodcastRTM] Joined channel:", channel);
    },
    [addAudienceMessage],
  );

  const sendAudienceMessage = useCallback(
    async (text: string, displayName: string) => {
      const rtm = rtmClientRef.current;
      const channel = channelRef.current;
      if (!rtm || !channel) return;

      // Rate limiting: 10s between messages
      const now = Date.now();
      if (now - lastSendRef.current < 10000) return;
      lastSendRef.current = now;

      const isQuestion = text.includes("?");
      const payload = {
        id: `${now}-${Math.random().toString(36).slice(2, 6)}`,
        text,
        displayName,
        timestamp: now,
        isQuestion,
      };

      await rtm.publish(channel, JSON.stringify(payload), {
        customType: "AUDIENCE_CHAT",
      });

      // Also add to local store immediately
      addAudienceMessage({
        ...payload,
        userId: "local",
      });
    },
    [addAudienceMessage],
  );

  const sendQuestionToAgent = useCallback(
    async (question: string) => {
      try {
        const api = ConversationalAIAPI.getInstance();
        await api.chat(String(hostRtcUid), {
          messageType: EChatMessageType.TEXT,
          text: `[Audience Question] ${question}`,
        });
        console.log("[PodcastRTM] Sent question to host agent:", question);
      } catch (err) {
        console.error("[PodcastRTM] Failed to send question to agent:", err);
      }
    },
    [hostRtcUid],
  );

  const leaveRTM = useCallback(async () => {
    const rtm = rtmClientRef.current;
    const channel = channelRef.current;
    if (!rtm) return;

    try {
      if (channel) await rtm.unsubscribe(channel);
      await rtm.logout();
    } catch {
      // Ignore cleanup errors
    }
    rtmClientRef.current = null;
    channelRef.current = null;
    setIsConnected(false);
    console.log("[PodcastRTM] Left channel");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const rtm = rtmClientRef.current;
      if (rtm) {
        rtm.logout().catch(() => {});
        rtmClientRef.current = null;
      }
    };
  }, []);

  return {
    rtmClient: rtmClientRef.current,
    joinRTM,
    leaveRTM,
    sendAudienceMessage,
    sendQuestionToAgent,
    isConnected,
  };
};
