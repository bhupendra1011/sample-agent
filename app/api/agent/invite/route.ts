import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-token";
import type {
  AgentSettings,
  AgentParametersConfig,
  TurnDetectionConfig,
  FillerWordsConfig,
  SalConfig,
} from "@/types/agora";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID!;
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET!;

const DEFAULT_GREETING_MESSAGE =
  "Hello {{username}}, glad to meet you, how can I help you?";

type InviteBody = {
  channelName: string;
  uid: string;
  agentSettings: AgentSettings;
  /** User display name; injected as llm.template_variables.username for greeting */
  username?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InviteBody;
    const { channelName, uid, agentSettings, username } = body;

    if (!channelName || !uid) {
      return NextResponse.json(
        { error: "channelName and uid are required" },
        { status: 400 },
      );
    }

    if (!agentSettings) {
      return NextResponse.json(
        { error: "agentSettings is required" },
        { status: 400 },
      );
    }

    if (!APP_CERTIFICATE || !CUSTOMER_ID || !CUSTOMER_SECRET) {
      return NextResponse.json(
        {
          error:
            "Server missing Agora credentials. Check environment variables.",
        },
        { status: 500 },
      );
    }

    // Generate token for the agent
    // When RTM is enabled, use buildTokenWithRtm to grant both RTC and Signaling privileges
    const agentUid = agentSettings.agent_rtc_uid ?? 0; // Use pre-assigned UID or let Agora assign
    const agentAccount = String(agentUid);
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
    const {
      llm,
      tts,
      asr,
      turn_detection,
      advanced_features,
      parameters,
      avatar,
    } = agentSettings;

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
          privilegeExpiration,
        )
      : RtcTokenBuilder.buildTokenWithUid(
          APP_ID,
          APP_CERTIFICATE,
          channelName,
          agentUid,
          RtcRole.PUBLISHER,
          tokenExpiration,
          privilegeExpiration,
        );

    // Helper: true when client sent empty/sentinel so we inject key from server (keys never exposed to client)
    const shouldInjectServerKey = (v: string | undefined) =>
      !v || v.trim() === "" || v === "__USE_SERVER__" || v === "***MASKED***";

    // Build LLM config (inject server key when client does not provide one)
    const llmApiKey = shouldInjectServerKey(llm.api_key)
      ? (
          process.env.LLM_API_KEY ||
          process.env.NEXT_PUBLIC_LLM_API_KEY ||
          ""
        ).trim()
      : (llm.api_key ?? "").trim();
    const llmPayload: Record<string, unknown> = {
      url: llm.url,
      api_key: llmApiKey,
    };

    if (llm.headers) {
      llmPayload.headers = llm.headers;
    }

    if (llm.system_messages && llm.system_messages.length > 0) {
      llmPayload.system_messages = llm.system_messages;
    }

    // Username as template_variables for greeting_message (e.g. "Hello {{username}}, glad to meet you...")
    const displayName = username != null && username !== "" ? username : "Guest";
    llmPayload.template_variables = {
      ...(typeof llm.template_variables === "object" && llm.template_variables != null
        ? llm.template_variables
        : {}),
      username: displayName,
    };
    // Support skipping greeting: "__NONE__" omits greeting_message so agent joins silently.
    const rawGreeting = llm.greeting_message?.trim() ?? "";
    if (rawGreeting !== "__NONE__") {
      llmPayload.greeting_message = rawGreeting || DEFAULT_GREETING_MESSAGE;
    }

    if (llm.failure_message) {
      llmPayload.failure_message = llm.failure_message;
    }

    if (llm.greeting_configs?.mode) {
      llmPayload.greeting_configs = { mode: llm.greeting_configs.mode };
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

    // Image modality: default to text + image so agent can receive picture messages
    llmPayload.input_modalities = llm.input_modalities ?? ["text", "image"];

    // Build MCP servers for LLM (tool invocation) — only include enabled servers
    const enabledMcpServers = (llm.mcp_servers ?? []).filter((s) => s.enabled !== false);
    if (enabledMcpServers.length > 0) {
      llmPayload.mcp_servers = enabledMcpServers.map((s) => {
        // Merge query params into endpoint URL, then strip UI-only fields
        const endpoint =
          s.queries && Object.keys(s.queries).length > 0
            ? `${s.endpoint.replace(/\?$/, "")}?${new URLSearchParams(s.queries).toString()}`
            : s.endpoint;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { enabled, queries, endpoint: _ep, ...rest } = s;
        return { ...rest, endpoint };
      });
    }

    // Build TTS config (inject server key when client does not provide one)
    const ttsParams = { ...tts.params } as Record<string, unknown>;
    const ttsKey = (ttsParams.key as string) ?? "";
    if (shouldInjectServerKey(ttsKey)) {
      const vendor = (tts.vendor ?? "microsoft") as string;
      if (vendor === "elevenlabs") {
        ttsParams.key = (
          process.env.ELEVENLABS_API_KEY ||
          process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ||
          ""
        ).trim();
      } else if (vendor === "openai") {
        ttsParams.key = (
          process.env.OPENAI_TTS_KEY ||
          process.env.NEXT_PUBLIC_OPENAI_TTS_KEY ||
          ""
        ).trim();
      } else {
        ttsParams.key = (
          process.env.MICROSOFT_TTS_KEY ||
          process.env.NEXT_PUBLIC_MICROSOFT_TTS_KEY ||
          ""
        ).trim();
      }
    }
    const ttsPayload: Record<string, unknown> = {
      vendor: tts.vendor,
      params: ttsParams,
    };

    // HeyGen and Anam avatars support TTS at 24,000 Hz (Agora docs). Force 24k when enabled.
    if (
      avatar?.enable &&
      (avatar?.vendor === "heygen" || avatar?.vendor === "anam")
    ) {
      ttsParams.sample_rate = 24000;
      ttsPayload.params = ttsParams;
    }

    // Build ASR config (optional); inject server key when client does not provide one
    const asrPayload: Record<string, unknown> | undefined = asr
      ? {
          ...(asr.vendor && { vendor: asr.vendor }),
          ...(asr.language && { language: asr.language }),
          ...(asr.params &&
            Object.keys(asr.params).length > 0 && {
              params: { ...asr.params },
            }),
        }
      : undefined;
    if (asrPayload?.params && typeof asrPayload.params === "object") {
      const p = asrPayload.params as Record<string, unknown>;
      const keyVal = (p.api_key as string) ?? (p.key as string) ?? "";
      if (shouldInjectServerKey(keyVal)) {
        const vendor = (asr?.vendor ?? "ares") as string;
        if (vendor === "deepgram") {
          p.api_key = (
            process.env.DEEPGRAM_API_KEY ||
            process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY ||
            ""
          ).trim();
        } else if (vendor === "microsoft") {
          p.key = (
            process.env.MICROSOFT_ASR_KEY ||
            process.env.NEXT_PUBLIC_MICROSOFT_ASR_KEY ||
            ""
          ).trim();
        }
      }
    }

    // When avatar is enabled, Agora does not allow "subscribe all" (*).
    // Must specify the local user's UID explicitly.
    // Override with agentSettings.remote_rtc_uids when provided (e.g. podcast dual-agent).
    const remoteRtcUids = agentSettings.remote_rtc_uids
      ? agentSettings.remote_rtc_uids
      : avatar?.enable ? [String(uid)] : ["*"];

    // Build the complete properties payload
    const propertiesPayload: Record<string, unknown> = {
      channel: channelName,
      token: agentRtcToken,
      agent_rtc_uid: String(agentUid),
      remote_rtc_uids: remoteRtcUids,
      enable_string_uid: false,
      idle_timeout: agentSettings.idle_timeout || 30,
      llm: llmPayload,
      tts: ttsPayload,
    };

    // Add optional ASR config
    if (asrPayload && Object.keys(asrPayload).length > 0) {
      propertiesPayload.asr = asrPayload;
    }

    // Add turn detection (Agora v2 config format)
    const legacyTurn = turn_detection as { silence_duration_ms?: number; mode?: string } | undefined;
    const turnDetectionNormalized =
      turn_detection && (turn_detection as TurnDetectionConfig).config
        ? (turn_detection as TurnDetectionConfig)
        : turn_detection && !(turn_detection as TurnDetectionConfig).config
        ? ({
            mode: "default" as const,
            config: {
              speech_threshold: 0.5,
              start_of_speech: {
                mode: "vad" as const,
                vad_config: {
                  interrupt_duration_ms: 160,
                  speaking_interrupt_duration_ms: 160,
                  prefix_padding_ms: 800,
                },
              },
              end_of_speech: {
                mode: (legacyTurn?.mode === "semantic" ? "semantic" : "vad") as "vad" | "semantic",
                ...(legacyTurn?.mode === "semantic"
                  ? {
                      semantic_config: {
                        silence_duration_ms: 320,
                        max_wait_ms: 3000,
                      },
                    }
                  : {
                      vad_config: {
                        silence_duration_ms: legacyTurn?.silence_duration_ms ?? 640,
                      },
                    }),
              },
            },
          } as TurnDetectionConfig)
        : null;
    // Only include turn_detection when user has enabled it (draft vs apply)
    if (agentSettings.enable_turn_detection && turnDetectionNormalized) {
      const td = turnDetectionNormalized;
      const cfg = td.config!;
      const start = cfg.start_of_speech;
      const end = cfg.end_of_speech;
      const turnPayload: Record<string, unknown> = {
        mode: td.mode ?? "default",
        config: {
          ...(cfg.speech_threshold != null && { speech_threshold: cfg.speech_threshold }),
          ...(start && (() => {
            const base: Record<string, unknown> = { mode: start.mode };
            if (start.mode === "vad" && start.vad_config) {
              base.vad_config = {
                interrupt_duration_ms: start.vad_config.interrupt_duration_ms ?? 160,
                speaking_interrupt_duration_ms: start.vad_config.speaking_interrupt_duration_ms ?? 160,
                prefix_padding_ms: start.vad_config.prefix_padding_ms ?? 800,
              };
            }
            if (start.mode === "keywords" && start.keywords_config) {
              base.keywords_config = {
                interrupt_duration_ms: start.keywords_config.interrupt_duration_ms ?? 160,
                prefix_padding_ms: start.keywords_config.prefix_padding_ms ?? 800,
                ...(start.keywords_config.triggered_keywords?.length && {
                  triggered_keywords: start.keywords_config.triggered_keywords,
                }),
              };
            }
            if (start.mode === "disabled" && start.disabled_config) {
              base.disabled_config = {
                strategy: start.disabled_config.strategy ?? "append",
              };
            }
            return { start_of_speech: base };
          })()),
          ...(end && (() => {
            const base: Record<string, unknown> = { mode: end.mode };
            if (end.mode === "vad" && end.vad_config) {
              base.vad_config = {
                silence_duration_ms: end.vad_config.silence_duration_ms ?? 640,
              };
            }
            if (end.mode === "semantic" && end.semantic_config) {
              base.semantic_config = {
                silence_duration_ms: end.semantic_config.silence_duration_ms ?? 320,
                max_wait_ms: end.semantic_config.max_wait_ms ?? 3000,
              };
            }
            return { end_of_speech: base };
          })()),
        },
      };
      propertiesPayload.turn_detection = turnPayload;
    }

    // Add filler words when enabled
    const filler_words = agentSettings.filler_words as FillerWordsConfig | undefined;
    if (filler_words?.enable) {
      const responseWaitMs = filler_words.trigger?.fixed_time_config?.response_wait_ms ?? 1500;
      const phrases = filler_words.content?.static_config?.phrases ?? [
        "Please wait.",
        "Okay.",
        "Uh-huh.",
      ];
      const selectionRule = filler_words.content?.static_config?.selection_rule ?? "shuffle";
      propertiesPayload.filler_words = {
        enable: true,
        trigger: {
          mode: "fixed_time",
          fixed_time_config: { response_wait_ms: responseWaitMs },
        },
        content: {
          mode: "static",
          static_config: {
            phrases: phrases.length ? phrases : ["Please wait.", "Okay.", "Uh-huh."],
            selection_rule: selectionRule,
          },
        },
      };
    }

    // Add SAL only when advanced_features.enable_sal is true
    if (advanced_features?.enable_sal) {
      const sal = agentSettings.sal as SalConfig | undefined;
      const salPayload: Record<string, unknown> = {
        sal_mode: sal?.sal_mode ?? "locking",
      };
      if (sal?.sample_urls && Object.keys(sal.sample_urls).length > 0) {
        salPayload.sample_urls = sal.sample_urls;
      }
      propertiesPayload.sal = salPayload;
    }

    // RTC mode: data_channel=datastream, input_modalities=text only. RTM mode: data_channel=rtm, input_modalities=text+image.
    const userExplicitlyDisabledRtm = advanced_features?.enable_rtm === false;
    if (userExplicitlyDisabledRtm) {
      llmPayload.input_modalities = ["text"];
    } else {
      llmPayload.input_modalities = (llm.input_modalities ?? ["text", "image"]) as ("text" | "image")[];
    }
    const inputModalities = llmPayload.input_modalities as ("text" | "image")[];
    const needsRtmForImage = inputModalities.includes("image");
    const enableRtmInPayload = userExplicitlyDisabledRtm
      ? false
      : (needsRtmForImage || (advanced_features?.enable_rtm ?? false));

    // Add advanced features; auto-enable tools when any enabled MCP server is configured
    const hasMcpServers = enabledMcpServers.length > 0;
    const enableTools = hasMcpServers || advanced_features?.enable_tools;
    if (advanced_features || hasMcpServers || needsRtmForImage) {
      propertiesPayload.advanced_features = {
        // Respect explicit enable_rtm: false from UI; otherwise enable when image modality needs RTM or user enabled it
        enable_rtm: enableRtmInPayload,
        ...(advanced_features?.enable_sal !== undefined && {
          enable_sal: advanced_features.enable_sal,
        }),
        enable_tools: enableTools,
      };
    }

    // Add agent parameters
    // data_channel per Agora docs: "rtm" = RTM (when enable_rtm); "datastream" = RTC data stream (default)
    const useRtm = enableRtmInPayload;
    const params = parameters as AgentParametersConfig | undefined;
    const shouldSetDataChannel =
      parameters || useRtm || (advanced_features != null && !useRtm);
    if (shouldSetDataChannel || params?.silence_config) {
      propertiesPayload.parameters = {
        ...(params?.enable_farewell !== undefined && {
          enable_farewell: params.enable_farewell,
        }),
        ...(params?.farewell_phrases && {
          farewell_phrases: params.farewell_phrases,
        }),
        // RTM: transcript + chat over Signaling. RTC: "datastream" = transcript over RTC data stream (client receives via stream-message)
        data_channel: useRtm ? "rtm" : "datastream",
        ...(params?.silence_config && {
          silence_config: {
            timeout_ms: params.silence_config.timeout_ms,
            action: params.silence_config.action,
            content: params.silence_config.content,
          },
        }),
      };
    }

    // Avatar RTC UID for client (returned when avatar is enabled)
    let avatarRtcUidReturn: string | null = null;

    // Add avatar configuration if enabled
    if (avatar?.enable) {
      // Use avatar UID from params if provided (e.g. podcast pre-assigns distinct UIDs), else default 999999
      const avatarUidFromParams = (avatar.params as unknown as Record<string, unknown>)?.agora_uid;
      const avatarUid = avatarUidFromParams ? Number(avatarUidFromParams) : 999999;
      avatarRtcUidReturn = String(avatarUid);
      const avatarRtcToken = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        avatarUid,
        RtcRole.PUBLISHER,
        tokenExpiration,
        privilegeExpiration,
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
        const akoolApiKey =
          (shouldInjectServerKey(akoolParams.api_key)
            ? ""
            : (akoolParams.api_key ?? "").trim()) ||
          (
            process.env.AKOOL_API_KEY ||
            process.env.NEXT_PUBLIC_AKOOL_API_KEY ||
            ""
          ).trim();
        const akoolAvatarId = (
          akoolParams.avatar_id ??
          process.env.NEXT_PUBLIC_AKOOL_AVATAR_ID ??
          ""
        ).trim();
        if (!akoolApiKey) {
          console.warn(
            "[Agent invite] Akool avatar enabled but api_key is missing. Set AKOOL_API_KEY or pass avatar.params.api_key.",
          );
          return NextResponse.json(
            {
              error:
                "Akool avatar requires api_key. Set AKOOL_API_KEY or configure avatar.params.api_key.",
            },
            { status: 400 },
          );
        }
        if (!akoolAvatarId) {
          console.warn(
            "[Agent invite] Akool avatar enabled but avatar_id is missing. Set NEXT_PUBLIC_AKOOL_AVATAR_ID or pass avatar.params.avatar_id.",
          );
          return NextResponse.json(
            {
              error:
                "Akool avatar requires avatar_id. Set NEXT_PUBLIC_AKOOL_AVATAR_ID or select an avatar in settings.",
            },
            { status: 400 },
          );
        }
        avatarParams.api_key = akoolApiKey;
        avatarParams.avatar_id = akoolAvatarId;
      } else if (avatar.vendor === "heygen") {
        const heygenParams = avatar.params as {
          api_key?: string;
          quality?: string;
          avatar_id?: string;
          disable_idle_timeout?: boolean;
          activity_idle_timeout?: number;
        };
        const heygenApiKey =
          (shouldInjectServerKey(heygenParams.api_key)
            ? ""
            : (heygenParams.api_key ?? "").trim()) ||
          (
            process.env.HEYGEN_API_KEY ||
            process.env.NEXT_PUBLIC_HEYGEN_API_KEY ||
            ""
          ).trim();
        const heygenAvatarId = heygenParams.avatar_id ?? "";
        if (!heygenApiKey.trim()) {
          console.warn(
            "[Agent invite] HeyGen avatar enabled but api_key is missing. Set HEYGEN_API_KEY or pass avatar.params.api_key.",
          );
          return NextResponse.json(
            {
              error:
                "HeyGen avatar requires api_key. Set HEYGEN_API_KEY or configure avatar.params.api_key.",
            },
            { status: 400 },
          );
        }
        if (!heygenAvatarId.trim()) {
          console.warn(
            "[Agent invite] HeyGen avatar enabled but avatar_id is missing. Select an avatar from the settings panel.",
          );
          return NextResponse.json(
            {
              error:
                "HeyGen avatar requires avatar_id. Please select an avatar from the settings panel.",
            },
            { status: 400 },
          );
        }
        avatarParams.api_key = heygenApiKey;
        avatarParams.quality =
          heygenParams.quality ||
          process.env.NEXT_PUBLIC_HEYGEN_QUALITY ||
          "medium";
        avatarParams.avatar_id = heygenAvatarId;
        avatarParams.disable_idle_timeout =
          heygenParams.disable_idle_timeout ?? false;
        avatarParams.activity_idle_timeout =
          heygenParams.activity_idle_timeout ?? 60;
        // HeyGen avatars only support TTS at 24,000 Hz. Ensure TTS is configured for 24k when using HeyGen.
      } else if (avatar.vendor === "anam") {
        const anamParams = avatar.params as {
          api_key?: string;
          anam_api_key?: string;
          avatar_id?: string;
          anam_avatar_id?: string;
        };
        const anamApiKey =
          (shouldInjectServerKey(anamParams.api_key ?? anamParams.anam_api_key)
            ? ""
            : (anamParams.anam_api_key ?? anamParams.api_key ?? "").trim()) ||
          (
            process.env.ANAM_API_KEY ||
            process.env.NEXT_PUBLIC_ANAM_API_KEY ||
            ""
          ).trim();
        const anamAvatarId = (
          anamParams.anam_avatar_id ??
          anamParams.avatar_id ??
          process.env.NEXT_PUBLIC_ANAM_AVATAR_ID ??
          ""
        ).trim();
        if (!anamApiKey) {
          console.warn(
            "[Agent invite] Anam avatar enabled but api_key is missing. Set ANAM_API_KEY or pass avatar.params.api_key.",
          );
          return NextResponse.json(
            {
              error:
                "Anam avatar requires api_key. Set ANAM_API_KEY or configure avatar.params.api_key.",
            },
            { status: 400 },
          );
        }
        if (!anamAvatarId) {
          console.warn(
            "[Agent invite] Anam avatar enabled but avatar_id is missing. Set NEXT_PUBLIC_ANAM_AVATAR_ID or pass avatar.params.avatar_id.",
          );
          return NextResponse.json(
            {
              error:
                "Anam avatar requires avatar_id. Set NEXT_PUBLIC_ANAM_AVATAR_ID or select an avatar in settings.",
            },
            { status: 400 },
          );
        }
        avatarParams.anam_api_key = anamApiKey;
        avatarParams.anam_avatar_id = anamAvatarId;
        avatarParams.anam_base_url = "https://api.anam.ai/v1";
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

    // Call Agora Conversational AI API — use same token as in payload for Authorization header
    // const authHeader = Buffer.from(
    //   `${CUSTOMER_ID}:${CUSTOMER_SECRET}`,
    // ).toString("base64");
    const apiUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${APP_ID}/join`;

    // Create a sanitized version for logging (mask sensitive data)
    const sanitizedPayload = JSON.parse(JSON.stringify(joinPayload));
    if (sanitizedPayload.properties?.token) {
      sanitizedPayload.properties.token =
        sanitizedPayload.properties.token.substring(0, 20) + "...";
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
    if (sanitizedPayload.properties?.avatar?.params?.anam_api_key) {
      sanitizedPayload.properties.avatar.params.anam_api_key = "***MASKED***";
    }
    if (sanitizedPayload.properties?.avatar?.params?.agora_token) {
      sanitizedPayload.properties.avatar.params.agora_token =
        sanitizedPayload.properties.avatar.params.agora_token.substring(0, 20) +
        "...";
    }

    console.log("\n========== AGORA CONVERSATIONAL AI REQUEST ==========");
    console.log("URL:", apiUrl);
    console.log("Method: POST");
    const tokenPreview = agentRtcToken
      ? `${agentRtcToken.substring(0, 25)}...`
      : "(empty)";
    console.log("Headers:", {
      "Content-Type": "application/json",
      Authorization: `agora token=${tokenPreview}`,
    });
    console.log("Payload:", JSON.stringify(sanitizedPayload, null, 2));
    // When AGORA_LOG_PAYLOAD_VERBOSE=1, log full payload (no masking) for verification
    if (process.env.AGORA_LOG_PAYLOAD_VERBOSE === "1" || process.env.AGORA_LOG_PAYLOAD_VERBOSE === "true") {
      console.log("\n[VERBOSE] Full request payload (no masking):");
      console.log(JSON.stringify(joinPayload, null, 2));
    }
    console.log("=====================================================\n");

    const agoraResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `agora token=${agentRtcToken}`,
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
        { status: agoraResponse.status },
      );
    }

    console.log("Agent started successfully with ID:", responseData.agent_id);

    const response: {
      agentId: string;
      status: string;
      agentRtcUid: string;
      avatarRtcUid?: string;
    } = {
      agentId: responseData.agent_id,
      status: responseData.status,
      agentRtcUid: String(agentUid),
    };
    if (avatarRtcUidReturn != null) {
      response.avatarRtcUid = avatarRtcUidReturn;
    }
    return NextResponse.json(response);
  } catch (error) {
    console.error("Agent invite error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
