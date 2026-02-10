import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-token";
import type { AgentSettings } from "@/types/agora";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID!;
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelName, uid, agentSettings } = body as {
      channelName: string;
      uid: string;
      agentSettings: AgentSettings;
    };

    if (!channelName || !uid) {
      return NextResponse.json(
        { error: "channelName and uid are required" },
        { status: 400 }
      );
    }

    if (!agentSettings) {
      return NextResponse.json(
        { error: "agentSettings is required" },
        { status: 400 }
      );
    }

    if (!APP_CERTIFICATE || !CUSTOMER_ID || !CUSTOMER_SECRET) {
      return NextResponse.json(
        { error: "Server missing Agora credentials. Check environment variables." },
        { status: 500 }
      );
    }

    // Generate token for the agent
    // When RTM is enabled, use buildTokenWithRtm to grant both RTC and Signaling privileges
    const agentUid = 0; // Let Agora assign UID
    const agentAccount = String(agentUid); // "0" - required for buildTokenWithRtm
    const tokenExpiration = 3600; // 1 hour
    const privilegeExpiration = 3600;

    console.log("\n========== AGENT INVITE DEBUG ==========");
    console.log("Channel Name (for token):", channelName);
    console.log("User UID:", uid);
    console.log("Agent UID:", agentUid);
    console.log("APP_ID:", APP_ID);
    console.log("APP_CERTIFICATE exists:", !!APP_CERTIFICATE);
    console.log("==========================================\n");

    // Build the join payload for Agora Conversational AI API v2
    // Based on: https://docs.agora.io/en/conversational-ai/rest-api/agent/join
    const { llm, tts, asr, turn_detection, advanced_features, parameters, avatar } = agentSettings;

    // Generate token with RTC+RTM privileges when RTM is enabled
    // Per: https://docs.agora.io/en/help/integration-issues/rtc_rtm_token
    const agentRtcToken = advanced_features?.enable_rtm
      ? RtcTokenBuilder.buildTokenWithRtm(
          APP_ID,
          APP_CERTIFICATE,
          channelName,
          agentAccount,
          RtcRole.PUBLISHER,
          tokenExpiration,
          privilegeExpiration
        )
      : RtcTokenBuilder.buildTokenWithUid(
          APP_ID,
          APP_CERTIFICATE,
          channelName,
          agentUid,
          RtcRole.PUBLISHER,
          tokenExpiration,
          privilegeExpiration
        );

    // Build LLM config
    const llmPayload: Record<string, unknown> = {
      url: llm.url,
      api_key: llm.api_key,
    };

    if (llm.headers) {
      llmPayload.headers = llm.headers;
    }

    if (llm.system_messages && llm.system_messages.length > 0) {
      llmPayload.system_messages = llm.system_messages;
    }

    if (llm.greeting_message) {
      llmPayload.greeting_message = llm.greeting_message;
    }

    if (llm.failure_message) {
      llmPayload.failure_message = llm.failure_message;
    }

    if (llm.max_history) {
      llmPayload.max_history = llm.max_history;
    }

    if (llm.style) {
      llmPayload.style = llm.style;
    }

    if (llm.params) {
      llmPayload.params = llm.params;
    }

    // Build MCP servers for LLM (tool invocation)
    if (llm.mcp_servers && llm.mcp_servers.length > 0) {
      llmPayload.mcp_servers = llm.mcp_servers.map((s) => {
        const endpoint =
          s.queries && Object.keys(s.queries).length > 0
            ? `${s.endpoint.replace(/\?$/, "")}?${new URLSearchParams(s.queries).toString()}`
            : s.endpoint;
        const entry: Record<string, unknown> = {
          name: s.name,
          endpoint,
          ...(s.timeout_ms != null && { timeout_ms: s.timeout_ms }),
          ...(s.headers && Object.keys(s.headers).length > 0 && { headers: s.headers }),
          ...(s.allowed_tools != null && { allowed_tools: s.allowed_tools }),
        };
        if (s.transport === "streamable_http") {
          entry.transport = "streamable_http";
        }
        return entry;
      });
    }

    // Build TTS config
    const ttsPayload: Record<string, unknown> = {
      vendor: tts.vendor,
      params: tts.params,
    };

    // Build ASR config (optional)
    const asrPayload: Record<string, unknown> | undefined = asr
      ? {
          ...(asr.vendor && { vendor: asr.vendor }),
          ...(asr.language && { language: asr.language }),
          ...(asr.params && Object.keys(asr.params).length > 0 && { params: asr.params }),
        }
      : undefined;

    // When avatar is enabled, Agora does not allow "subscribe all" (*).
    // Must specify the local user's UID explicitly.
    const remoteRtcUids = avatar?.enable ? [String(uid)] : ["*"];

    // Build the complete properties payload
    const propertiesPayload: Record<string, unknown> = {
      channel: channelName,
      token: agentRtcToken,
      agent_rtc_uid: String(agentUid),
      remote_rtc_uids: remoteRtcUids,
      enable_string_uid: true,
      idle_timeout: agentSettings.idle_timeout || 30,
      llm: llmPayload,
      tts: ttsPayload,
    };

    // Add optional ASR config
    if (asrPayload && Object.keys(asrPayload).length > 0) {
      propertiesPayload.asr = asrPayload;
    }

    // Add turn detection settings
    if (turn_detection) {
      propertiesPayload.turn_detection = {
        ...(turn_detection.silence_duration_ms && {
          silence_duration_ms: turn_detection.silence_duration_ms,
        }),
        ...(turn_detection.mode && { mode: turn_detection.mode }),
      };
    }

    // Add advanced features; auto-enable tools when any MCP server is configured
    const hasMcpServers = llm.mcp_servers && llm.mcp_servers.length > 0;
    const enableTools = hasMcpServers || advanced_features?.enable_tools;
    if (advanced_features || hasMcpServers) {
      propertiesPayload.advanced_features = {
        ...(advanced_features?.enable_mllm !== undefined && {
          enable_mllm: advanced_features.enable_mllm,
        }),
        ...(advanced_features?.enable_rtm !== undefined && {
          enable_rtm: advanced_features.enable_rtm,
        }),
        ...(advanced_features?.enable_sal !== undefined && {
          enable_sal: advanced_features.enable_sal,
        }),
        enable_tools: enableTools,
      };
    }

    // Add agent parameters
    // When RTM is enabled, set data_channel to "rtm" for transcript routing
    if (parameters || advanced_features?.enable_rtm) {
      propertiesPayload.parameters = {
        ...(parameters?.enable_farewell !== undefined && {
          enable_farewell: parameters.enable_farewell,
        }),
        ...(parameters?.farewell_phrases && {
          farewell_phrases: parameters.farewell_phrases,
        }),
        // Set data_channel to RTM when RTM is enabled (required for RTM transcript mode)
        ...(advanced_features?.enable_rtm && {
          data_channel: "rtm",
        }),
      };
    }

    // Add avatar configuration if enabled
    if (avatar?.enable) {
      // Use a distinct avatar UID (999999) to avoid conflicts with agent (0) or user
      const avatarUid = 999999;
      const avatarRtcToken = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        avatarUid,
        RtcRole.PUBLISHER,
        tokenExpiration,
        privilegeExpiration
      );

      // Build avatar params based on vendor
      const avatarParams: Record<string, unknown> = {
        agora_uid: String(avatarUid),
        agora_token: avatarRtcToken,
      };

      // Add vendor-specific params
      if (avatar.vendor === "akool") {
        const akoolParams = avatar.params as {
          api_key?: string;
          avatar_id?: string;
        };
        avatarParams.api_key =
          akoolParams.api_key || process.env.AKOOL_API_KEY || "";
        avatarParams.avatar_id = akoolParams.avatar_id || "";
      } else if (avatar.vendor === "heygen") {
        const heygenParams = avatar.params as {
          api_key?: string;
          quality?: string;
          avatar_id?: string;
          disable_idle_timeout?: boolean;
          activity_idle_timeout?: number;
        };
        avatarParams.api_key =
          heygenParams.api_key || process.env.HEYGEN_API_KEY || process.env.NEXT_PUBLIC_HEYGEN_API_KEY || "";
        avatarParams.quality = heygenParams.quality || process.env.NEXT_PUBLIC_HEYGEN_QUALITY || "medium";
        avatarParams.avatar_id = heygenParams.avatar_id ?? process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID ?? "";
        avatarParams.disable_idle_timeout = heygenParams.disable_idle_timeout ?? false;
        avatarParams.activity_idle_timeout = heygenParams.activity_idle_timeout ?? 60;
      }

      propertiesPayload.avatar = {
        enable: true,
        vendor: avatar.vendor,
        params: avatarParams,
      };
    }

    const joinPayload = {
      name: agentSettings.name,
      properties: propertiesPayload,
    };

    // Call Agora Conversational AI API
    const authHeader = Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString("base64");
    const apiUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${APP_ID}/join`;

    // Create a sanitized version for logging (mask sensitive data)
    const sanitizedPayload = JSON.parse(JSON.stringify(joinPayload));
    if (sanitizedPayload.properties?.token) {
      sanitizedPayload.properties.token = sanitizedPayload.properties.token.substring(0, 20) + "...";
    }
    if (sanitizedPayload.properties?.llm?.api_key) {
      sanitizedPayload.properties.llm.api_key = "***MASKED***";
    }
    if (sanitizedPayload.properties?.tts?.params?.key) {
      sanitizedPayload.properties.tts.params.key = "***MASKED***";
    }
    if (sanitizedPayload.properties?.avatar?.params?.api_key) {
      sanitizedPayload.properties.avatar.params.api_key = "***MASKED***";
    }
    if (sanitizedPayload.properties?.avatar?.params?.agora_token) {
      sanitizedPayload.properties.avatar.params.agora_token = sanitizedPayload.properties.avatar.params.agora_token.substring(0, 20) + "...";
    }

    console.log("\n========== AGORA CONVERSATIONAL AI REQUEST ==========");
    console.log("URL:", apiUrl);
    console.log("Method: POST");
    console.log("Headers:", {
      "Content-Type": "application/json",
      "Authorization": "Basic ***MASKED***",
    });
    console.log("Payload:", JSON.stringify(sanitizedPayload, null, 2));
    console.log("=====================================================\n");

    const agoraResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(joinPayload),
    });

    const responseData = await agoraResponse.json();

    console.log("\n========== AGORA CONVERSATIONAL AI RESPONSE ==========");
    console.log("Status:", agoraResponse.status, agoraResponse.statusText);
    console.log("Response:", JSON.stringify(responseData, null, 2));
    console.log("======================================================\n");

    if (!agoraResponse.ok) {
      console.error("Agora Conversational AI join failed:", responseData);
      return NextResponse.json(
        { error: "Failed to start AI agent", details: responseData },
        { status: agoraResponse.status }
      );
    }

    console.log("Agent started successfully with ID:", responseData.agent_id);

    return NextResponse.json({
      agentId: responseData.agent_id,
      status: responseData.status,
      agentRtcUid: String(agentUid),
    });
  } catch (error) {
    console.error("Agent invite error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
