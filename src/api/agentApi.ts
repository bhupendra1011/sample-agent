// src/api/agentApi.ts
import type { AgentSettings } from "@/types/agora";

/**
 * Invites an AI agent to the current call via the server-side API route.
 * Passes the complete AgentSettings to the API.
 */
export async function inviteAgent(
  channelName: string,
  uid: string,
  agentSettings: AgentSettings
): Promise<{ agentId: string; status: string; agentRtcUid?: string }> {
  const response = await fetch("/api/agent/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channelName,
      uid,
      agentSettings,
    }),
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
  agentSettings: AgentSettings
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
export async function stopAgent(agentId: string): Promise<{ success: boolean }> {
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
