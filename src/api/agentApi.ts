// src/api/agentApi.ts
import type { AgentSettings } from "@/types/agora";

export interface CustomJoinPayload {
  name: string;
  properties: Record<string, unknown>;
}

/**
 * Invites an AI agent to the current call via the server-side API route.
 * When useCustomPayload is true, sends customJoinPayload instead of agentSettings.
 */
export async function inviteAgent(
  channelName: string,
  uid: string,
  agentSettings: AgentSettings,
  options?: {
    useCustomPayload?: boolean;
    customJoinPayload?: CustomJoinPayload;
  },
): Promise<{
  agentId: string;
  status: string;
  agentRtcUid?: string;
  avatarRtcUid?: string;
}> {
  const body: Record<string, unknown> = {
    channelName,
    uid,
    agentSettings,
  };
  if (options?.useCustomPayload && options?.customJoinPayload) {
    body.useCustomPayload = true;
    body.customJoinPayload = options.customJoinPayload;
  }

  const response = await fetch("/api/agent/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to invite agent");
  }

  return response.json();
}

/**
 * Updates agent configuration at runtime (LLM, token).
 * See: https://docs.agora.io/en/conversational-ai/rest-api/agent/update
 */
export async function updateAgent(
  agentId: string,
  channelName: string,
  agentSettings: AgentSettings,
): Promise<{ agentId: string; status: string }> {
  const response = await fetch("/api/agent/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      channelName,
      agentSettings,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update agent");
  }

  return response.json();
}

/**
 * Stops the AI agent and removes it from the call.
 */
export async function stopAgent(
  agentId: string,
): Promise<{ success: boolean }> {
  const response = await fetch("/api/agent/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to stop agent");
  }

  return response.json();
}
