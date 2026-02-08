"use client";

import { useEffect, useRef, useCallback } from "react";
import type { IAgoraRTCClient } from "agora-rtc-sdk-ng";
import useAppStore from "@/store/useAppStore";
import type {
  EAgentState,
  ITranscriptHelperItem,
} from "@/types/agora";
import {
  EAgentState as EAgentStateEnum,
  ETurnStatus,
  ETranscriptRenderMode,
} from "@/types/agora";
import {
  ConversationalAIAPI,
  EConversationalAIAPIEvents,
} from "@/conversational-ai-api";
import { ETranscriptHelperMode } from "@/conversational-ai-api/type";

interface UseConversationalAIOptions {
  rtcClient: IAgoraRTCClient | null;
  rtmClient: unknown | null; // agora-rtm-sdk v2 RTM client (type unknown to avoid any)
  channelId: string | null;
  isAgentActive: boolean;
  transcriptionMode: "rtc" | "rtm";
  agentRtcUid: string | null;
}

/**
 * Hook to handle conversational AI transcript integration
 * Supports both RTC stream-message (vanilla) and RTM (full API) modes
 */
export const useConversationalAI = ({
  rtcClient,
  rtmClient,
  channelId,
  isAgentActive,
  transcriptionMode,
  agentRtcUid,
}: UseConversationalAIOptions) => {
  const setAgentState = useAppStore((state) => state.setAgentState);
  const setTranscriptItems = useAppStore((state) => state.setTranscriptItems);
  const setCurrentInProgressMessage = useAppStore(
    (state) => state.setCurrentInProgressMessage
  );
  const transcriptRenderMode = useAppStore((state) => state.transcriptRenderMode);
  const toolkitInitializedRef = useRef(false);
  
  // Store render mode in ref to avoid re-init on mode change
  const renderModeRef = useRef(transcriptRenderMode);
  renderModeRef.current = transcriptRenderMode;

  // Map ETranscriptRenderMode to ETranscriptHelperMode for toolkit (using ref to avoid dependency)
  const getToolkitRenderMode = useCallback((): ETranscriptHelperMode => {
    const mode = renderModeRef.current;
    return mode === ETranscriptRenderMode.TEXT
      ? ETranscriptHelperMode.TEXT
      : mode === ETranscriptRenderMode.WORD
      ? ETranscriptHelperMode.WORD
      : ETranscriptHelperMode.UNKNOWN;
  }, []); // No dependencies - uses ref

  // Initialize and use ConversationalAIAPI toolkit (per Agora docs)
  useEffect(() => {
    console.log("[useConversationalAI] Effect running, isAgentActive:", isAgentActive, 
      "rtcClient:", !!rtcClient, "rtmClient:", !!rtmClient, 
      "channelId:", channelId, "agentRtcUid:", agentRtcUid);
    
    if (
      !isAgentActive ||
      !rtcClient ||
      !rtmClient ||
      !channelId ||
      !agentRtcUid
    ) {
      console.log("[useConversationalAI] Skipping init - missing dependencies");
      return;
    }

    try {
      console.log("[useConversationalAI] Initializing ConversationalAIAPI...");
      
      // 1. Init toolkit instance
      const api = ConversationalAIAPI.init({
        rtcEngine: rtcClient,
        rtmEngine: rtmClient,
        renderMode: getToolkitRenderMode(),
        enableLog: true,
      });
      api.setAgentRtcUid(agentRtcUid);
      
      console.log("[useConversationalAI] API initialized, agentRtcUid set to:", agentRtcUid);

      // 2. Handle TRANSCRIPT_UPDATED - update store
      const handleTranscriptUpdated = (...args: unknown[]) => {
        const chatHistory = args[0] as ITranscriptHelperItem[];
        const completed = chatHistory.filter(
          (m) => m.status !== ETurnStatus.IN_PROGRESS
        );
        const inProgress = chatHistory.find(
          (m) => m.status === ETurnStatus.IN_PROGRESS
        );
        completed.sort((a, b) => a.turn_id - b.turn_id);
        setTranscriptItems(completed);
        setCurrentInProgressMessage(inProgress ?? null);
      };

      // 3. Handle AGENT_STATE_CHANGED
      const handleAgentStateChanged = (...args: unknown[]) => {
        const event = args[1] as { state: string };
        if (event?.state && Object.values(EAgentStateEnum).includes(event.state as EAgentState)) {
          setAgentState(event.state as EAgentState);
        }
      };

      api.on(EConversationalAIAPIEvents.TRANSCRIPT_UPDATED, handleTranscriptUpdated);
      api.on(EConversationalAIAPIEvents.AGENT_STATE_CHANGED, handleAgentStateChanged);

      // 4. Subscribe to channel (before agent speaks / as per docs)
      api.subscribeMessage(channelId);
      toolkitInitializedRef.current = true;
      
      console.log("[useConversationalAI] Subscribed to channel:", channelId);

      return () => {
        console.log("[useConversationalAI] Cleanup - unsubscribing from channel:", channelId);
        api.unsubscribe();
        api.off(EConversationalAIAPIEvents.TRANSCRIPT_UPDATED, handleTranscriptUpdated);
        api.off(EConversationalAIAPIEvents.AGENT_STATE_CHANGED, handleAgentStateChanged);
        toolkitInitializedRef.current = false;
      };
    } catch (err) {
      console.error("[useConversationalAI] Toolkit init error:", err);
      return undefined;
    }
  }, [
    isAgentActive,
    rtcClient,
    rtmClient,
    channelId,
    agentRtcUid,
    getToolkitRenderMode,
    setTranscriptItems,
    setCurrentInProgressMessage,
    setAgentState,
  ]);

  // Clear store when agent stops (toolkit unsubscribe is handled by effect cleanup)
  useEffect(() => {
    if (!isAgentActive) {
      setTranscriptItems([]);
      setCurrentInProgressMessage(null);
    }
  }, [isAgentActive, setTranscriptItems, setCurrentInProgressMessage]);

  // Send chat message (RTM mode only)
  // Note: Without agent_rtm_uid in the join API, sending messages to the agent may not be supported.
  // For now, we use agentRtcUid as a fallback, but this may not work until Agora adds agent_rtm_uid support.
  const sendChatMessage = useCallback(
    async (text: string, image?: File) => {
      // Use agentRtcUid as fallback (agent_rtm_uid not available in join API)
      const targetUid = agentRtcUid;
      if (!rtmClient || !targetUid || transcriptionMode !== "rtm") {
        console.error("Cannot send message: RTM not available, no agent UID, or not in RTM mode", {
          hasRtmClient: !!rtmClient,
          agentRtcUid: targetUid,
          transcriptionMode,
        });
        return;
      }

      try {
        if (
          typeof rtmClient === "object" &&
          rtmClient !== null &&
          "publish" in rtmClient
        ) {
          const rtm = rtmClient as {
            publish: (
              userId: string,
              message: string,
              options?: { channelType?: string; customType?: string }
            ) => Promise<void>;
          };

          console.log("[sendChatMessage] Sending to agent UID:", targetUid, "(Note: agent_rtm_uid not available in join API)");

          if (image) {
            // Convert image to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = reader.result as string;
              const message = {
                uuid: `img-${Date.now()}`,
                image_base64: base64.split(",")[1], // Remove data:image/...;base64, prefix
              };
              await rtm.publish(targetUid, JSON.stringify(message), {
                channelType: "USER",
                customType: "image.upload",
              });
            };
            reader.readAsDataURL(image);
          } else if (text.trim()) {
            const message = {
              priority: "interrupted",
              interruptable: true,
              message: text.trim(),
            };
            await rtm.publish(targetUid, JSON.stringify(message), {
              channelType: "USER",
              customType: "user.transcription",
            });
          }
        }
      } catch (error) {
        console.error("Failed to send chat message:", error);
        throw error;
      }
    },
    [rtmClient, agentRtcUid, transcriptionMode]
  );

  return {
    sendChatMessage,
  };
};
