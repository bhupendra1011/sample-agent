// src/hooks/podcast/usePodcastTranscript.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import type { IAgoraRTCClient } from "agora-rtc-sdk-ng";
import { ConversationalAIAPI, EConversationalAIAPIEvents } from "@/conversational-ai-api";
import usePodcastStore from "@/store/usePodcastStore";
import type { ITranscriptHelperItem } from "@/types/agora";
import { ETurnStatus, EAgentState } from "@/types/agora";
import type { PodcastTranscriptEntry } from "@/types/podcast";
import { podcastDB } from "@/utils/podcast/podcastDB";

interface UsePodcastTranscriptOptions {
  rtcClient: IAgoraRTCClient | null;
  rtmClient: unknown;
  channelId: string | null;
  hostRtcUid: number;
  guestRtcUid: number;
  hostName: string;
  guestName: string;
  isActive: boolean;
  sessionId: string | null;
}

export const usePodcastTranscript = (options: UsePodcastTranscriptOptions) => {
  const {
    rtcClient,
    rtmClient,
    channelId,
    hostRtcUid,
    guestRtcUid,
    hostName,
    guestName,
    isActive,
    sessionId,
  } = options;

  const apiRef = useRef<ConversationalAIAPI | null>(null);
  const subscribedRef = useRef(false);

  const addTranscript = usePodcastStore((s) => s.addTranscript);
  const updateTranscript = usePodcastStore((s) => s.updateTranscript);
  const setHostAgentState = usePodcastStore((s) => s.setHostAgentState);
  const setGuestAgentState = usePodcastStore((s) => s.setGuestAgentState);

  const handleTranscriptUpdate = useCallback(
    (items: ITranscriptHelperItem[]) => {
      if (!items || items.length === 0) return;

      const store = usePodcastStore.getState();

      for (const item of items) {
        // Determine role based on UID (now correctly set from RTM publisher)
        const itemUid = String(item.uid);
        let role: "host" | "guest";
        let speakerName: string;

        if (itemUid === String(hostRtcUid)) {
          role = "host";
          speakerName = hostName;
        } else if (itemUid === String(guestRtcUid)) {
          role = "guest";
          speakerName = guestName;
        } else {
          // Skip transcripts from non-agent UIDs (e.g. viewer kick-start messages)
          continue;
        }

        const isFinal = item.status === ETurnStatus.END || item.status === ETurnStatus.INTERRUPTED;

        // Check if we already have this turn
        const existing = store.transcripts.find(
          (t) => t.turnId === item.turn_id && t.uid === itemUid,
        );

        if (existing) {
          if (item.text !== existing.text || isFinal !== existing.isFinal) {
            updateTranscript(item.turn_id, itemUid, item.text, isFinal);
          }
        } else if (item.text.trim()) {
          const entry: PodcastTranscriptEntry = {
            uid: itemUid,
            role,
            speakerName,
            text: item.text,
            isFinal,
            timestamp: item._time || Date.now(),
            turnId: item.turn_id,
          };
          addTranscript(entry);
        }
      }

      // Persist to IndexedDB
      if (sessionId) {
        const currentTranscripts = usePodcastStore.getState().transcripts;
        podcastDB.saveTranscripts(sessionId, currentTranscripts).catch(() => {});
      }
    },
    [hostRtcUid, guestRtcUid, hostName, guestName, addTranscript, updateTranscript, sessionId],
  );

  useEffect(() => {
    if (!isActive || !rtcClient || !channelId) return;

    // Initialize ConversationalAIAPI (singleton)
    const api = ConversationalAIAPI.init({
      rtcEngine: rtcClient,
      rtmEngine: rtmClient,
      enableLog: true,
    });
    apiRef.current = api;

    // Subscribe to transcript events
    if (!subscribedRef.current) {
      api.subscribeMessage(channelId);
      subscribedRef.current = true;
    }

    const wrappedHandler = (...args: unknown[]) =>
      handleTranscriptUpdate(args[0] as ITranscriptHelperItem[]);
    api.on(EConversationalAIAPIEvents.TRANSCRIPT_UPDATED, wrappedHandler);

    // Handle agent state changes (idle/listening/thinking/speaking)
    const handleAgentStateChanged = (...args: unknown[]) => {
      const uid = String(args[0]);
      const event = args[1] as { state: string };
      if (!event?.state) return;

      const state = event.state as EAgentState;
      const validStates = Object.values(EAgentState);
      if (!validStates.includes(state)) return;

      if (uid === String(hostRtcUid)) {
        setHostAgentState(state);
      } else if (uid === String(guestRtcUid)) {
        setGuestAgentState(state);
      }
    };
    api.on(EConversationalAIAPIEvents.AGENT_STATE_CHANGED, handleAgentStateChanged);

    return () => {
      api.off(EConversationalAIAPIEvents.TRANSCRIPT_UPDATED, wrappedHandler);
      api.off(EConversationalAIAPIEvents.AGENT_STATE_CHANGED, handleAgentStateChanged);
    };
  }, [isActive, rtcClient, rtmClient, channelId, handleTranscriptUpdate, hostRtcUid, guestRtcUid, setHostAgentState, setGuestAgentState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (apiRef.current && subscribedRef.current) {
        apiRef.current.unsubscribe();
        subscribedRef.current = false;
      }
    };
  }, []);

  return {
    isSubscribed: subscribedRef.current,
  };
};
