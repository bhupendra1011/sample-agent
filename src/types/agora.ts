// src/types/agora.ts

import type { ILocalAudioTrack, ILocalVideoTrack } from "agora-rtc-sdk-ng";

// ============================================
// CONVERSATIONAL AI AGENT SETTINGS
// Based on: https://docs.agora.io/en/conversational-ai/rest-api/agent/join
// ============================================

// --- LLM Vendors ---
export type LLMVendor =
  | "openai"
  | "azure_openai"
  | "anthropic"
  | "gemini"
  | "groq"
  | "coze"
  | "dify"
  | "minimax"
  | "custom";

export interface LLMConfig {
  /** LLM API endpoint URL (required) */
  url: string;
  /** API key for authentication (required) */
  api_key: string;
  /** Custom headers as JSON string (e.g., for Anthropic) */
  headers?: string;
  /** System messages for context */
  system_messages?: Array<{ role: string; content: string }>;
  /** Initial greeting when agent starts */
  greeting_message?: string;
  /** Fallback message on failure */
  failure_message?: string;
  /** Number of conversation history messages (1-1024, default 32) */
  max_history?: number;
  /** LLM style: "openai" or "anthropic" */
  style?: "openai" | "anthropic";
  /** Model-specific parameters */
  params?: {
    model: string;
    max_tokens?: number;
    temperature?: number;
    [key: string]: unknown;
  };
}

// --- TTS Vendors ---
export type TTSVendor =
  | "microsoft"
  | "elevenlabs"
  | "minimax"
  | "cartesia"
  | "openai"
  | "fish_audio"
  | "google"
  | "polly";

export interface TTSMicrosoftParams {
  key: string;
  region: string;
  voice_name: string;
  speed?: number;
  volume?: number;
  sample_rate?: number;
}

export interface TTSElevenLabsParams {
  base_url?: string;
  key: string;
  model_id: string;
  voice_id: string;
  sample_rate?: number;
  speed?: number;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface TTSOpenAIParams {
  key: string;
  model: string;
  voice: string;
  speed?: number;
}

export interface TTSConfig {
  /** TTS vendor (required) */
  vendor: TTSVendor;
  /** Vendor-specific parameters */
  params: TTSMicrosoftParams | TTSElevenLabsParams | TTSOpenAIParams | Record<string, unknown>;
}

// --- ASR (STT) Vendors ---
export type ASRVendor =
  | "ares"
  | "microsoft"
  | "deepgram"
  | "openai"
  | "google"
  | "speechmatics"
  | "assemblyai"
  | "transcribe";

export interface ASRMicrosoftParams {
  key: string;
  region: string;
  language: string;
  phrase_list?: string[];
}

export interface ASRDeepgramParams {
  key: string;
  url?: string;
  model?: string;
  language?: string;
  keyterm?: string;
}

export interface ASRConfig {
  /** ASR vendor (default: ares) */
  vendor?: ASRVendor;
  /** Language code (BCP-47, e.g., en-US) */
  language?: string;
  /** Vendor-specific parameters */
  params?: ASRMicrosoftParams | ASRDeepgramParams | Record<string, unknown>;
}

// --- Turn Detection ---
export interface TurnDetectionConfig {
  /** Silence duration (ms) before processing response (default 500) */
  silence_duration_ms?: number;
  /** Voice activity detection mode */
  mode?: "server_vad" | "semantic";
}

// --- Advanced Features ---
export interface AdvancedFeaturesConfig {
  /** Enable Multimodal LLM (vision capabilities) */
  enable_mllm?: boolean;
  /** Enable RTM messaging */
  enable_rtm?: boolean;
  /** Enable Server Automation Library */
  enable_sal?: boolean;
  /** Enable function calling / tools */
  enable_tools?: boolean;
}

// --- Agent Parameters ---
export interface AgentParametersConfig {
  /** Enable farewell detection */
  enable_farewell?: boolean;
  /** Custom farewell phrases */
  farewell_phrases?: string[];
}

// --- Complete Agent Settings (used for UI) ---
export interface AgentSettings {
  // Agent name (required, unique identifier)
  name: string;

  // LLM Configuration (required)
  llm: LLMConfig;

  // TTS Configuration (required)
  tts: TTSConfig;

  // ASR Configuration (optional, defaults to ares)
  asr?: ASRConfig;

  // Idle timeout in seconds (default 30)
  idle_timeout?: number;

  // Turn detection settings
  turn_detection?: TurnDetectionConfig;

  // Advanced features
  advanced_features?: AdvancedFeaturesConfig;

  // Agent parameters
  parameters?: AgentParametersConfig;
}

// --- Preset Configurations for Quick Setup ---
export interface VendorPreset {
  label: string;
  value: string;
  url?: string;
  defaultModel?: string;
  models?: string[];
  requiresApiKey: boolean;
  style?: "openai" | "anthropic";
  headers?: string;
}

export const LLM_PRESETS: Record<LLMVendor, VendorPreset> = {
  openai: {
    label: "OpenAI",
    value: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    requiresApiKey: true,
    style: "openai",
  },
  azure_openai: {
    label: "Azure OpenAI",
    value: "azure_openai",
    url: "",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-35-turbo"],
    requiresApiKey: true,
    style: "openai",
  },
  anthropic: {
    label: "Anthropic Claude",
    value: "anthropic",
    url: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-3-5-sonnet-latest",
    models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
    requiresApiKey: true,
    style: "anthropic",
    headers: '{"anthropic-version":"2023-06-01"}',
  },
  gemini: {
    label: "Google Gemini",
    value: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    defaultModel: "gemini-2.0-flash",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    requiresApiKey: true,
    style: "openai",
  },
  groq: {
    label: "Groq",
    value: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    requiresApiKey: true,
    style: "openai",
  },
  coze: {
    label: "Coze",
    value: "coze",
    url: "",
    defaultModel: "",
    requiresApiKey: true,
    style: "openai",
  },
  dify: {
    label: "Dify",
    value: "dify",
    url: "",
    defaultModel: "",
    requiresApiKey: true,
    style: "openai",
  },
  minimax: {
    label: "MiniMax",
    value: "minimax",
    url: "",
    defaultModel: "",
    requiresApiKey: true,
    style: "openai",
  },
  custom: {
    label: "Custom (OpenAI-compatible)",
    value: "custom",
    url: "",
    defaultModel: "",
    requiresApiKey: false,
    style: "openai",
  },
};

export const TTS_PRESETS: Record<TTSVendor, VendorPreset & { voices?: string[] }> = {
  microsoft: {
    label: "Microsoft Azure",
    value: "microsoft",
    requiresApiKey: true,
    voices: [
      "en-US-AndrewMultilingualNeural",
      "en-US-JennyNeural",
      "en-US-GuyNeural",
      "en-US-AriaNeural",
      "en-GB-SoniaNeural",
    ],
  },
  elevenlabs: {
    label: "ElevenLabs",
    value: "elevenlabs",
    requiresApiKey: true,
    defaultModel: "eleven_flash_v2_5",
    models: ["eleven_flash_v2_5", "eleven_multilingual_v2", "eleven_turbo_v2"],
  },
  openai: {
    label: "OpenAI TTS",
    value: "openai",
    requiresApiKey: true,
    defaultModel: "tts-1",
    models: ["tts-1", "tts-1-hd"],
    voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
  },
  minimax: {
    label: "MiniMax",
    value: "minimax",
    requiresApiKey: true,
  },
  cartesia: {
    label: "Cartesia (Beta)",
    value: "cartesia",
    requiresApiKey: true,
  },
  fish_audio: {
    label: "Fish Audio (Beta)",
    value: "fish_audio",
    requiresApiKey: true,
  },
  google: {
    label: "Google TTS (Beta)",
    value: "google",
    requiresApiKey: true,
  },
  polly: {
    label: "Amazon Polly (Beta)",
    value: "polly",
    requiresApiKey: true,
  },
};

export const ASR_PRESETS: Record<ASRVendor, VendorPreset> = {
  ares: {
    label: "Agora ARES (Built-in)",
    value: "ares",
    requiresApiKey: false,
  },
  microsoft: {
    label: "Microsoft Azure",
    value: "microsoft",
    requiresApiKey: true,
  },
  deepgram: {
    label: "Deepgram",
    value: "deepgram",
    requiresApiKey: true,
    defaultModel: "nova-3",
    models: ["nova-3", "nova-2", "enhanced", "base"],
  },
  openai: {
    label: "OpenAI Whisper (Beta)",
    value: "openai",
    requiresApiKey: true,
  },
  google: {
    label: "Google (Beta)",
    value: "google",
    requiresApiKey: true,
  },
  speechmatics: {
    label: "Speechmatics",
    value: "speechmatics",
    requiresApiKey: true,
  },
  assemblyai: {
    label: "AssemblyAI (Beta)",
    value: "assemblyai",
    requiresApiKey: true,
  },
  transcribe: {
    label: "Amazon Transcribe (Beta)",
    value: "transcribe",
    requiresApiKey: true,
  },
};

export const SUPPORTED_LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-IN", label: "English (India)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "pt-PT", label: "Portuguese" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ar-SA", label: "Arabic" },
  { code: "ru-RU", label: "Russian" },
  { code: "nl-NL", label: "Dutch" },
  { code: "tr-TR", label: "Turkish" },
  { code: "vi-VN", label: "Vietnamese" },
  { code: "th-TH", label: "Thai" },
  { code: "id-ID", label: "Indonesian" },
  { code: "ms-MY", label: "Malay" },
  { code: "fil-PH", label: "Filipino" },
];

/**
 * Defines the structure for local audio and video tracks managed by Agora RTC.
 * These tracks represent the media streams captured from the user's microphone and camera.
 */
export interface LocalAgoraTracks {
  audioTrack: ILocalAudioTrack | null;
  videoTrack: ILocalVideoTrack | null;
}

/**
 * Represents an audio input device (microphone) for device selection.
 */
export interface AudioDevice {
  /** Unique identifier for the device */
  deviceId: string;
  /** Human-readable device name (only available after permission granted) */
  label: string;
  /** Device kind - always 'audioinput' for microphones */
  kind: "audioinput";
}

/**
 * Voice settings for microphone configuration.
 */
export interface VoiceSettings {
  /** Currently selected microphone device ID (null for system default) */
  selectedMicrophoneId: string | null;
  /** Whether a microphone test is currently in progress */
  testInProgress: boolean;
}

/**
 * Defines the structure for a participant in the video call.
 * This interface is primarily used within your Zustand store (`remoteParticipants`)
 * to maintain the UI-relevant state of each user (local and remote).
 * Data for remote participants is often synchronized via Agora RTM attributes.
 */
export interface Participant {
  /**
   * The display name of the participant (e.g., entered by the user).
   * Synchronized via RTM.
   */
  name: string;

  /**
   * Boolean indicating if the participant's microphone is currently muted.
   * `true` means muted, `false` means unmuted. Synchronized via RTM.
   */
  micMuted: boolean;

  /**
   * Boolean indicating if the participant's video is currently off/disabled.
   * `true` means video is off, `false` means video is on. Synchronized via RTM.
   */
  videoMuted: boolean;
}

/**
 * Defines the structure of the response received from your Agora Managed Services backend
 * when creating or joining a meeting. This response contains all necessary tokens and IDs
 * to initialize Agora RTC and RTM clients, and to manage screen sharing.
 */

/**
 * Host control message types for RTM User Channel (private messages)
 */
export type HostControlMessageType = "host-mute-request" | "host-unmute-request";

/**
 * Message payload for host mute/unmute requests
 * Sent via RTM User Channel (private, to specific user)
 */
export interface HostControlMessage {
  type: HostControlMessageType;
  fromUid: string;
  fromName: string;
  targetUid: string;
  mediaType: "audio" | "video" | "both";
  timestamp: number;
}

/**
 * Pending unmute request shown in consent modal
 */
export interface PendingUnmuteRequest {
  fromUid: string;
  fromName: string;
  mediaType: "audio" | "video" | "both";
  timestamp: number;
}

export interface MeetingResponse {
  /**
   * The unique ID of the Agora channel/meeting.
   * (Previously 'channelId' in interface, now matches backend 'channel' key)
   */
  channel: string;

  /**
   * The display title/name of the meeting.
   */
  title: string;

  /**
   * Indicates if the joined user is designated as a host.
   */
  isHost: boolean;

  /**
   * A secret string, likely for internal use or backend validation.
   */
  secret: string;

  /**
   * A salt for the secret, likely for internal use or backend validation.
   */
  secretSalt: string;

  /**
   * Details regarding the main user's tokens and UID for RTC and RTM.
   * These are now nested within a 'mainUser' object.
   */
  mainUser: {
    /**
     * The RTC token required for the main user.
     */
    rtc: string;
    /**
     * The RTM token required for the main user.
     */
    rtm: string;
    /**
     * The UID (User ID) assigned to the main user.
     */
    uid: string;
  };

  /**
   * Details regarding the screen sharing setup, including a dedicated RTC token and UID
   * for the screen sharing stream.
   */
  screenShare: {
    /**
     * The RTC token specifically for the screen sharing stream.
     */
    rtc: string;
    /**
     * The RTM token for screen sharing (can be null if not provided/used).
     * Added 'null' to the type.
     */
    rtm: string | null;
    /**
     * The UID for the screen sharing stream.
     * Type changed from string to number.
     */
    uid: number;
  };

  /**
   * The passphrase specifically for host access to the meeting.
   * (Still optional, as it's typically only present when a meeting is created).
   */
  hostPassphrase?: string;

  /**
   * The passphrase specifically for attendee/viewer access to the meeting.
   * (Still optional, as it's typically only present when a meeting is created).
   */
  viewerPassphrase?: string;

  /**
   * Whiteboard credentials returned from the join channel response.
   * Contains room token, UUID, appIdentifier, and region needed to join the interactive whiteboard.
   */
  whiteboard?: {
    room_token: string;
    room_uuid: string;
    appIdentifier?: string;
    region?: string;
  };
}
