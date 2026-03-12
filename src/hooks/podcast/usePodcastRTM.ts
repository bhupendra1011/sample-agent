// src/hooks/podcast/usePodcastRTM.ts
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import AgoraRTM from "agora-rtm-sdk";
import { AGORA_CONFIG } from "@/api/agoraApi";
import usePodcastStore from "@/store/usePodcastStore";
import type { AudienceMessage } from "@/types/podcast";
import { ConversationalAIAPI, EChatMessageType } from "@/conversational-ai-api";
import { EAgentState } from "@/types/agora";

interface UsePodcastRTMOptions {
  hostRtcUid: number;
  guestName?: string;
}

export const usePodcastRTM = (options: UsePodcastRTMOptions) => {
  const { hostRtcUid, guestName } = options;

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
          // Skip own messages (already added locally in sendAudienceMessage)
          if (e.publisher === String(uid)) return;

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

      // Auto-relay to host agent — skip during wrap-up
      const currentStatus = usePodcastStore.getState().status;
      if (currentStatus !== "wrapping-up") {
        try {
          const api = ConversationalAIAPI.getInstance();
          const store = usePodcastStore.getState();
          const isGuestSpeaking =
            store.guestAgent?.state === EAgentState.SPEAKING;

          // If guest is speaking, interrupt the guest first so host can take over
          if (isGuestSpeaking && store.guestAgent?.rtcUid) {
            await api.chat(String(store.guestAgent.rtcUid), {
              messageType: EChatMessageType.TEXT,
              text: `[PAUSE] The host needs to address an audience message. Stop speaking and listen.`,
            });
            console.log("[PodcastRTM] Interrupted guest agent for audience message");
          }

          const prefix = isGuestSpeaking
            ? `[URGENT - Politely interrupt your guest and address this audience message]`
            : `[Audience Message from ${displayName}]`;

          await api.chat(String(hostRtcUid), {
            messageType: EChatMessageType.TEXT,
            text: `${prefix} ${text}`,
          });
          console.log("[PodcastRTM] Auto-relayed audience message to host agent");
        } catch (err) {
          console.error("[PodcastRTM] Failed to relay to host:", err);
        }
      }
    },
    [addAudienceMessage, hostRtcUid],
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
