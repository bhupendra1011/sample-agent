// src/api/agentApi.ts
import type { AgentSettings, AgentQueryStatus } from "@/types/agora";

export interface CustomJoinPayload {
  name: string;
  properties: Record<string, unknown>;
}

/** Default greeting message using {{username}} template variable (Agora LLM template_variables). */
export const DEFAULT_GREETING_MESSAGE =
  "Hello {{username}}, glad to meet you, how can I help you?";

/**
 * Invites an AI agent to the current call via the server-side API route.
 * When useCustomPayload is true, sends customJoinPayload instead of agentSettings.
 * Pass username so the server can inject it as llm.template_variables for greeting_message etc.
 */
export async function inviteAgent(
  channelName: string,
  uid: string,
  agentSettings: AgentSettings,
  options?: {
    useCustomPayload?: boolean;
    customJoinPayload?: CustomJoinPayload;
    /** User display name; sent as llm.template_variables.username for greeting e.g. "Hello {{username}}, ..." */
    username?: string;
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
  if (options?.username != null && options.username !== "") {
    body.username = options.username;
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
 * Queries the current operational status of an AI agent.
 * See: https://docs.agora.io/en/conversational-ai/rest-api/agent/query
 */
export async function queryAgent(
  agentId: string,
): Promise<AgentQueryStatus> {
  const response = await fetch(`/api/agent/query?agentId=${encodeURIComponent(agentId)}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to query agent status");
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
