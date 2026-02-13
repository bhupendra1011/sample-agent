"use client";

import React, { useState } from "react";
import {
  MdClose,
  MdSmartToy,
  MdMic,
  MdExtension,
  MdAdd,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdBuild,
  MdCode,
} from "react-icons/md";
import VoiceSettings from "./VoiceSettings";
import useAppStore from "@/store/useAppStore";
import { showToast } from "@/services/uiService";
import type {
  AgentSettings,
  MCPServerConfig,
  MCPToolInfo,
} from "@/types/agora";
import Modal from "@/components/common/Modal";
import type { IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import {
  HEYGEN_AVATAR_GROUPS,
  HEYGEN_DEFAULT_AVATAR_ID,
} from "@/constants/heygenAvatars";

type SettingsTab = "ai-agent" | "voice" | "mcp-server";

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAgentSettings: (settings: AgentSettings) => void;
  isAgentUpdating?: boolean;
  isAgentActive?: boolean;
}

// Tab button component
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      active
        ? "bg-agora-accent-blue text-white"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
    }`}
  >
    {icon}
    {label}
  </button>
);

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  isOpen,
  onClose,
  onSaveAgentSettings,
  isAgentUpdating = false,
  isAgentActive = false,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai-agent");
  const [useCustomPayload, setUseCustomPayload] = useState(false);
  const [viewCustomSettingsOpen, setViewCustomSettingsOpen] = useState(false);
  const localAudioTrack = useAppStore((state) => state.localAudioTrack);

  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    import("@/services/settingsDb")
      .then((m) => m.getCustomAgentSettings())
      .then((stored) => {
        if (!cancelled && stored)
          setUseCustomPayload(!!stored.useCustomPayload);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) setViewCustomSettingsOpen(false);
  }, [isOpen]);

  const showTabs = !useCustomPayload && !viewCustomSettingsOpen;
  const showCustomView = useCustomPayload || viewCustomSettingsOpen;

  const handleDisableCustomPayload = React.useCallback(() => {
    setUseCustomPayload(false);
    import("@/services/settingsDb").then((m) =>
      m.getCustomAgentSettings().then((stored) =>
        m.setCustomAgentSettings({
          useCustomPayload: false,
          customPayloadJson: stored?.customPayloadJson ?? "",
        }),
      ),
    );
    setViewCustomSettingsOpen(false);
  }, []);

  if (!isOpen) return null;

  // Create a compatible track interface for VoiceSettings
  // Cast to IMicrophoneAudioTrack since that's what createMicrophoneAudioTrack returns
  const microphoneTrack = localAudioTrack as IMicrophoneAudioTrack | null;
  const microphoneTrackInterface = microphoneTrack
    ? {
        setDevice: async (deviceId: string) => {
          await microphoneTrack.setDevice(deviceId);
        },
        getTrackLabel: () => microphoneTrack.getTrackLabel(),
        getVolumeLevel: () => microphoneTrack.getVolumeLevel(),
      }
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[520px] max-w-full bg-white dark:bg-gray-900 z-50 shadow-2xl flex flex-col transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Settings
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configure your meeting preferences
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MdClose className="text-gray-500 dark:text-gray-400" size={24} />
          </button>
        </div>

        {/* Custom Settings row: View to open, Back when in custom view */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MdCode className="text-gray-600 dark:text-gray-400" size={20} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Custom Settings
            </span>
          </div>
          {showCustomView ? (
            <button
              type="button"
              onClick={() => {
                if (useCustomPayload) handleDisableCustomPayload();
                else setViewCustomSettingsOpen(false);
              }}
              className="text-sm font-medium text-agora-accent-blue hover:underline px-2 py-1"
            >
              Back to agent settings
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewCustomSettingsOpen(true)}
              className="text-sm font-medium text-agora-accent-blue hover:underline px-2 py-1"
            >
              View custom settings
            </button>
          )}
        </div>

        {/* Tabs (only when custom settings not applied and view not open) */}
        {showTabs && (
          <div className="flex gap-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <TabButton
              active={activeTab === "ai-agent"}
              onClick={() => setActiveTab("ai-agent")}
              icon={<MdSmartToy size={18} />}
              label="AI Agent"
            />
            <TabButton
              active={activeTab === "voice"}
              onClick={() => setActiveTab("voice")}
              icon={<MdMic size={18} />}
              label="Voice"
            />
            <TabButton
              active={activeTab === "mcp-server"}
              onClick={() => setActiveTab("mcp-server")}
              icon={<MdExtension size={18} />}
              label="MCP Server"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {showCustomView ? (
            <CustomSettingsTabContent
              onClose={onClose}
              useCustomPayload={useCustomPayload}
              onDisableCustomPayload={handleDisableCustomPayload}
              onApplyCustomPayload={async (json) => {
                await import("@/services/settingsDb").then((m) =>
                  m.setCustomAgentSettings({
                    useCustomPayload: true,
                    customPayloadJson: json,
                  }),
                );
                setUseCustomPayload(true);
                setViewCustomSettingsOpen(false);
              }}
              onBackFromView={() => setViewCustomSettingsOpen(false)}
              isDraftView={viewCustomSettingsOpen && !useCustomPayload}
            />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto relative">
              {isAgentUpdating && activeTab === "ai-agent" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-agora-accent-blue border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Updating Agent Configuration...
                    </span>
                  </div>
                </div>
              )}
              {activeTab === "ai-agent" ? (
                <AgentSettingsContent
                  onSave={onSaveAgentSettings}
                  onClose={onClose}
                  isAgentActive={isAgentActive}
                />
              ) : activeTab === "mcp-server" ? (
                <MCPServerTabContent
                  onSave={onSaveAgentSettings}
                  onClose={onClose}
                />
              ) : (
                <div className="px-6 py-4">
                  <VoiceSettings
                    localMicrophoneTrack={microphoneTrackInterface}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Extracted Agent Settings content (without the sidebar wrapper)
interface AgentSettingsContentProps {
  onSave: (settings: AgentSettings) => void;
  onClose: () => void;
  isAgentActive?: boolean;
}

const AgentSettingsContent: React.FC<AgentSettingsContentProps> = ({
  onSave,
  onClose,
  isAgentActive = false,
}) => {
  return (
    <AgentSettingsSidebarContent
      onSave={onSave}
      onClose={onClose}
      isAgentActive={isAgentActive}
    />
  );
};

// This is a simplified inline version - we need to refactor AgentSettingsSidebar
// to export its content separately. For now, let's create an embedded version.
import {
  AgentSettings as AgentSettingsType,
  LLMVendor,
  TTSVendor,
  ASRVendor,
  AvatarVendor,
  LLMConfig,
  TTSConfig,
  ASRConfig,
  AvatarConfig,
  AvatarAkoolParams,
  AvatarHeyGenParams,
  LLM_PRESETS,
  TTS_PRESETS,
  ASR_PRESETS,
  SUPPORTED_LANGUAGES,
} from "@/types/agora";
import InfoTooltip from "@/components/common/InfoTooltip";
import {
  MdExpandMore,
  MdExpandLess,
  MdRecordVoiceOver,
  MdGraphicEq,
  MdTune,
  MdFace,
} from "react-icons/md";

// Section collapse state
type SectionKey = "llm" | "tts" | "asr" | "avatar" | "advanced";

// Environment variable helpers (no API keys here; server injects them from server-only env vars)
const ENV_MAP: Record<string, string | undefined> = {
  LLM_VENDOR: process.env.NEXT_PUBLIC_LLM_VENDOR,
  TTS_VENDOR: process.env.NEXT_PUBLIC_TTS_VENDOR,
  ASR_VENDOR: process.env.NEXT_PUBLIC_ASR_VENDOR,
  LLM_URL: process.env.NEXT_PUBLIC_LLM_URL,
  LLM_MODEL: process.env.NEXT_PUBLIC_LLM_MODEL,
  MICROSOFT_TTS_REGION: process.env.NEXT_PUBLIC_MICROSOFT_TTS_REGION,
  MICROSOFT_TTS_VOICE: process.env.NEXT_PUBLIC_MICROSOFT_TTS_VOICE,
  ELEVENLABS_VOICE_ID: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
  ELEVENLABS_MODEL_ID: process.env.NEXT_PUBLIC_ELEVENLABS_MODEL_ID,
  ELEVENLABS_SAMPLE_RATE: process.env.NEXT_PUBLIC_ELEVENLABS_SAMPLE_RATE,
  OPENAI_TTS_MODEL: process.env.NEXT_PUBLIC_OPENAI_TTS_MODEL,
  OPENAI_TTS_VOICE: process.env.NEXT_PUBLIC_OPENAI_TTS_VOICE,
  DEEPGRAM_URL: process.env.NEXT_PUBLIC_DEEPGRAM_URL,
  DEEPGRAM_MODEL: process.env.NEXT_PUBLIC_DEEPGRAM_MODEL,
  DEEPGRAM_LANGUAGE: process.env.NEXT_PUBLIC_DEEPGRAM_LANGUAGE,
  MICROSOFT_ASR_REGION: process.env.NEXT_PUBLIC_MICROSOFT_ASR_REGION,
  ASR_LANGUAGE: process.env.NEXT_PUBLIC_ASR_LANGUAGE,
  AKOOL_AVATAR_ID: process.env.NEXT_PUBLIC_AKOOL_AVATAR_ID,
  HEYGEN_AVATAR_ID: process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID,
  HEYGEN_QUALITY: process.env.NEXT_PUBLIC_HEYGEN_QUALITY,
};

const getEnvVar = (key: string, defaultValue: string = ""): string => {
  return ENV_MAP[key] || defaultValue;
};

/** Never show API keys in the DOM; show placeholder when non-empty so server-injected or user-typed keys are not visible. */
const maskKeyForDisplay = (key: string | undefined): string =>
  key && String(key).trim() !== "" ? "••••••••" : "";

/** On change for a masked key field: keep existing key if user did not change, otherwise set to new value. */
const keyChange = (
  newValue: string,
  currentKey: string | undefined,
  setKey: (k: string) => void,
) => {
  if (newValue === "••••••••") setKey(currentKey ?? "");
  else setKey(newValue);
};

const getDefaultTTSVendor = (): TTSVendor => {
  const vendor = getEnvVar("TTS_VENDOR", "microsoft");
  if (
    vendor === "elevenlabs" ||
    vendor === "openai" ||
    vendor === "microsoft"
  ) {
    return vendor;
  }
  return "microsoft";
};

const getDefaultASRVendor = (): ASRVendor => {
  const vendor = getEnvVar("ASR_VENDOR", "ares");
  if (vendor === "deepgram" || vendor === "microsoft" || vendor === "ares") {
    return vendor;
  }
  return "ares";
};

const getDefaultTTSParams = (vendor: TTSVendor): Record<string, unknown> => {
  // API keys are never read client-side; server injects from env when key is empty
  switch (vendor) {
    case "elevenlabs":
      return {
        key: "",
        voice_id: getEnvVar("ELEVENLABS_VOICE_ID"),
        model_id: getEnvVar("ELEVENLABS_MODEL_ID", "eleven_flash_v2_5"),
        sample_rate: parseInt(getEnvVar("ELEVENLABS_SAMPLE_RATE", "24000"), 10),
        speed: 1.0,
      };
    case "openai":
      return {
        key: "",
        model: getEnvVar("OPENAI_TTS_MODEL", "tts-1"),
        voice: getEnvVar("OPENAI_TTS_VOICE", "alloy"),
        speed: 1.0,
      };
    case "microsoft":
    default:
      return {
        key: "",
        region: getEnvVar("MICROSOFT_TTS_REGION", "eastus"),
        voice_name: getEnvVar(
          "MICROSOFT_TTS_VOICE",
          "en-US-AndrewMultilingualNeural",
        ),
        speed: 1.0,
        volume: 100,
      };
  }
};

const getDefaultASRConfig = (vendor: ASRVendor): ASRConfig => {
  const language = getEnvVar("ASR_LANGUAGE", "en-US");
  // API keys are never read client-side; server injects from env when key is empty
  switch (vendor) {
    case "deepgram":
      return {
        vendor: "deepgram",
        language,
        params: {
          api_key: "",
          url: getEnvVar("DEEPGRAM_URL", "wss://api.deepgram.com/v1/listen"),
          model: getEnvVar("DEEPGRAM_MODEL", "nova-2"),
          language: getEnvVar("DEEPGRAM_LANGUAGE", "en"),
        },
      };
    case "microsoft":
      return {
        vendor: "microsoft",
        language,
        params: {
          key: "",
          region: getEnvVar("MICROSOFT_ASR_REGION", "eastus"),
        },
      };
    case "ares":
    default:
      return {
        vendor: "ares",
        language,
      };
  }
};

const AVATAR_PRESETS: Record<AvatarVendor, { label: string; value: string }> = {
  akool: { label: "Akool (Beta)", value: "akool" },
  heygen: { label: "HeyGen (Beta)", value: "heygen" },
};

const getDefaultAvatarParams = (
  vendor: AvatarVendor,
): AvatarAkoolParams | AvatarHeyGenParams => {
  // API keys are never read client-side; server injects from env when key is empty
  switch (vendor) {
    case "akool":
      return {
        api_key: "",
        agora_uid: "",
        avatar_id: getEnvVar("AKOOL_AVATAR_ID"),
      };
    case "heygen":
      return {
        api_key: "",
        quality: (getEnvVar("HEYGEN_QUALITY", "medium") || "medium") as
          | "low"
          | "medium"
          | "high",
        agora_uid: "",
        avatar_id: HEYGEN_DEFAULT_AVATAR_ID,
        disable_idle_timeout: false,
        activity_idle_timeout: 60,
      };
  }
};

const getDefaultSettings = (): AgentSettingsType => {
  const ttsVendor = getDefaultTTSVendor();
  const asrVendor = getDefaultASRVendor();

  return {
    name: `agent-${Date.now()}`,
    llm: {
      url: getEnvVar("LLM_URL", LLM_PRESETS.openai.url!),
      api_key: "",
      system_messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant in a video call. Be concise, friendly, and conversational.",
        },
      ],
      greeting_message:
        "Hello! I'm your AI assistant. How can I help you today?",
      failure_message:
        "I'm sorry, I didn't catch that. Could you please repeat?",
      max_history: 10,
      style: "openai",
      params: {
        model: getEnvVar("LLM_MODEL", "gpt-4o-mini"),
      },
      mcp_servers: [],
    },
    tts: {
      vendor: ttsVendor,
      params: getDefaultTTSParams(ttsVendor),
    },
    asr: getDefaultASRConfig(asrVendor),
    idle_timeout: 0,
    turn_detection: {
      silence_duration_ms: 500,
      mode: "server_vad",
    },
    advanced_features: {
      enable_mllm: false,
      enable_rtm: false,
      enable_tools: false,
    },
    avatar: {
      enable: false,
      vendor: "heygen",
      params: getDefaultAvatarParams("heygen"),
    },
  };
};

// Styled components for the form
const FormField: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  tooltip?: string;
}> = ({ label, required, children, hint, tooltip }) => (
  <div className="mb-4">
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      <span>
        {label}
        {required && (
          <span className="text-red-500 dark:text-red-400 ml-1">*</span>
        )}
      </span>
      {tooltip && <InfoTooltip content={tooltip} />}
    </label>
    {children}
    {hint && (
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{hint}</p>
    )}
  </div>
);

const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
> = ({ error, className = "", ...props }) => (
  <input
    {...props}
    className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white text-sm
      placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-agora-accent-blue dark:focus:ring-agora-accent-blue
      transition-colors ${error ? "border-red-500" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"}
      ${className}`}
  />
);

const Select: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
> = ({ error, className = "", children, ...props }) => (
  <select
    {...props}
    className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white text-sm
      focus:outline-none focus:ring-2 focus:ring-agora-accent-blue dark:focus:ring-agora-accent-blue transition-colors
      ${error ? "border-red-500" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"}
      ${className}`}
  >
    {children}
  </select>
);

const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
> = ({ error, className = "", ...props }) => (
  <textarea
    {...props}
    className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white text-sm
      placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-agora-accent-blue dark:focus:ring-agora-accent-blue
      transition-colors resize-none ${error ? "border-red-500" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"}
      ${className}`}
  />
);

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}> = ({ title, icon, isOpen, onToggle, children, badge }) => (
  <div className="border border-gray-300 dark:border-gray-700 rounded-lg mb-3 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-agora-accent-blue">{icon}</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {title}
        </span>
        {badge && (
          <span className="text-xs px-2 py-0.5 bg-agora-accent-blue/15 text-agora-accent-blue rounded-full">
            {badge}
          </span>
        )}
      </div>
      {isOpen ? (
        <MdExpandLess className="text-gray-500 dark:text-gray-400" size={20} />
      ) : (
        <MdExpandMore className="text-gray-500 dark:text-gray-400" size={20} />
      )}
    </button>
    {isOpen && (
      <div className="px-4 py-4 bg-gray-50 dark:bg-gray-900/50">{children}</div>
    )}
  </div>
);

const Toggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}> = ({ label, checked, onChange, hint }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-agora-accent-blue" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  </div>
);

// --- MCP Server tab and modal ---
const MCP_PROTOCOL_OPTIONS: {
  value: MCPServerConfig["transport"];
  label: string;
}[] = [
  { value: "sse", label: "SSE" },
  { value: "http", label: "HTTP" },
  { value: "streamable_http", label: "Streamable HTTP" },
];

interface MCPServerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (server: MCPServerConfig) => void;
  initialServer?: MCPServerConfig | null;
}

const MCPServerFormModal: React.FC<MCPServerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialServer = null,
}) => {
  const isEdit = !!initialServer;
  const [name, setName] = React.useState(initialServer?.name ?? "");
  const [endpoint, setEndpoint] = React.useState(initialServer?.endpoint ?? "");
  const [timeoutMs, setTimeoutMs] = React.useState(
    initialServer?.timeout_ms ?? 10000,
  );
  const [transport, setTransport] = React.useState<
    MCPServerConfig["transport"]
  >(initialServer?.transport ?? "streamable_http");
  const [headers, setHeaders] = React.useState<
    Array<{ key: string; value: string }>
  >(
    initialServer?.headers
      ? Object.entries(initialServer.headers).map(([key, value]) => ({
          key,
          value,
        }))
      : [],
  );
  const [queries, setQueries] = React.useState<
    Array<{ key: string; value: string }>
  >(
    initialServer?.queries
      ? Object.entries(initialServer.queries).map(([key, value]) => ({
          key,
          value,
        }))
      : [],
  );
  const [nameError, setNameError] = React.useState("");
  const [endpointError, setEndpointError] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setName(initialServer?.name ?? "");
      setEndpoint(initialServer?.endpoint ?? "");
      setTimeoutMs(initialServer?.timeout_ms ?? 10000);
      setTransport(initialServer?.transport ?? "streamable_http");
      setHeaders(
        initialServer?.headers
          ? Object.entries(initialServer.headers).map(([key, value]) => ({
              key,
              value,
            }))
          : [],
      );
      setQueries(
        initialServer?.queries
          ? Object.entries(initialServer.queries).map(([key, value]) => ({
              key,
              value,
            }))
          : [],
      );
      setNameError("");
      setEndpointError("");
    }
  }, [isOpen, initialServer]);

  const validate = (): boolean => {
    let ok = true;
    if (!name.trim()) {
      setNameError("Name is required.");
      ok = false;
    } else if (name.length > 48) {
      setNameError("Max 48 characters.");
      ok = false;
    } else if (!/^[a-zA-Z0-9]+$/.test(name)) {
      setNameError("Only letters and numbers.");
      ok = false;
    } else {
      setNameError("");
    }
    if (!endpoint.trim()) {
      setEndpointError("Server URL is required.");
      ok = false;
    } else {
      try {
        new URL(endpoint);
        setEndpointError("");
      } catch {
        setEndpointError("Enter a valid URL.");
        ok = false;
      }
    }
    return ok;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const headersObj: Record<string, string> = {};
    headers.forEach(({ key, value }) => {
      if (key.trim()) headersObj[key.trim()] = value;
    });
    const queriesObj: Record<string, string> = {};
    queries.forEach(({ key, value }) => {
      if (key.trim()) queriesObj[key.trim()] = value;
    });
    onSave({
      name: name.trim(),
      endpoint: endpoint.trim(),
      timeout_ms: timeoutMs,
      transport,
      ...(Object.keys(headersObj).length > 0 && { headers: headersObj }),
      ...(Object.keys(queriesObj).length > 0 && { queries: queriesObj }),
      ...(initialServer?.allowed_tools != null && {
        allowed_tools: initialServer.allowed_tools,
      }),
    });
  };

  const addHeader = () =>
    setHeaders((prev) => [...prev, { key: "", value: "" }]);
  const removeHeader = (i: number) =>
    setHeaders((prev) => prev.filter((_, idx) => idx !== i));
  const updateHeader = (i: number, field: "key" | "value", val: string) =>
    setHeaders((prev) =>
      prev.map((h, idx) => (idx === i ? { ...h, [field]: val } : h)),
    );
  const addQuery = () =>
    setQueries((prev) => [...prev, { key: "", value: "" }]);
  const removeQuery = (i: number) =>
    setQueries((prev) => prev.filter((_, idx) => idx !== i));
  const updateQuery = (i: number, field: "key" | "value", val: string) =>
    setQueries((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, [field]: val } : q)),
    );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit MCP Server" : "New Custom MCP Server"}
    >
      <div className="space-y-4">
        <FormField label="Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="MCP Server name"
            maxLength={48}
            error={!!nameError}
          />
          {nameError && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
              {nameError}
            </p>
          )}
        </FormField>
        <FormField label="Server URL" required>
          <Input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://example.com/sse"
            error={!!endpointError}
          />
          {endpointError && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
              {endpointError}
            </p>
          )}
        </FormField>
        <FormField label="Timeout (ms)" hint="Request timeout in milliseconds.">
          <Input
            type="number"
            min={1000}
            value={timeoutMs}
            onChange={(e) =>
              setTimeoutMs(parseInt(e.target.value, 10) || 10000)
            }
          />
        </FormField>
        <FormField label="Server Protocol" required>
          <div className="flex gap-4 flex-wrap">
            {MCP_PROTOCOL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="mcp-transport"
                  checked={transport === opt.value}
                  onChange={() => setTransport(opt.value)}
                  className="text-agora-accent-blue focus:ring-agora-accent-blue dark:focus:ring-agora-accent-blue"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </FormField>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            HTTP Headers
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Add custom headers for additional configuration or authentication.
          </p>
          {headers.map((h, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input
                placeholder="Header name"
                value={h.key}
                onChange={(e) => updateHeader(i, "key", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={h.value}
                onChange={(e) => updateHeader(i, "value", e.target.value)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeHeader(i)}
                className="p-2 text-gray-500 hover:text-red-500 dark:hover:text-red-400"
              >
                <MdClose size={18} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addHeader}
            className="text-sm text-agora-accent-blue hover:underline"
          >
            + Add Header
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Query Parameters
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Query string parameters to append to the URL.
          </p>
          {queries.map((q, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input
                placeholder="Key"
                value={q.key}
                onChange={(e) => updateQuery(i, "key", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={q.value}
                onChange={(e) => updateQuery(i, "value", e.target.value)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeQuery(i)}
                className="p-2 text-gray-500 hover:text-red-500 dark:hover:text-red-400"
              >
                <MdClose size={18} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addQuery}
            className="text-sm text-agora-accent-blue hover:underline"
          >
            + Add Parameter
          </button>
        </div>
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 bg-agora-accent-blue hover:opacity-90 text-white font-medium rounded-lg transition-colors"
          >
            {isEdit ? "Save" : "Add"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface MCPServerTabContentProps {
  onSave: (settings: AgentSettings) => void;
  onClose: () => void;
}

const MCPServerTabContent: React.FC<MCPServerTabContentProps> = ({
  onSave,
  onClose,
}) => {
  const agentSettings = useAppStore((state) => state.agentSettings);
  const [servers, setServers] = React.useState<MCPServerConfig[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [toolsByServer, setToolsByServer] = React.useState<
    Record<string, MCPToolInfo[]>
  >({});
  const [refreshingServer, setRefreshingServer] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    const list = agentSettings?.llm?.mcp_servers ?? [];
    setServers(list);
  }, [agentSettings?.llm?.mcp_servers]);

  const handleAddOrUpdate = React.useCallback(
    (server: MCPServerConfig) => {
      if (editingIndex !== null) {
        setServers((prev) =>
          prev.map((s, i) => (i === editingIndex ? server : s)),
        );
        setEditingIndex(null);
      } else {
        setServers((prev) => [...prev, server]);
      }
    },
    [editingIndex],
  );

  const handleSave = React.useCallback(() => {
    const base = agentSettings ?? getDefaultSettings();
    const next: AgentSettings = {
      ...base,
      name: base.name ?? `agent-${Date.now()}`,
      llm: {
        ...base.llm,
        url: base.llm?.url ?? "",
        api_key: base.llm?.api_key ?? "",
        mcp_servers: servers,
      },
      tts: base.tts ?? ({} as AgentSettings["tts"]),
      advanced_features: {
        ...base.advanced_features,
        enable_tools:
          servers.length > 0
            ? true
            : (base.advanced_features?.enable_tools ?? false),
      },
    };
    onSave(next);
    onClose();
  }, [agentSettings, servers, onSave, onClose]);

  const refreshTools = React.useCallback(async (server: MCPServerConfig) => {
    setRefreshingServer(server.name);
    try {
      const res = await fetch("/api/mcp/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: server.endpoint,
          headers: server.headers,
          transport: server.transport,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const tools: MCPToolInfo[] = Array.isArray(data.tools)
          ? data.tools
          : [];
        setToolsByServer((prev) => ({ ...prev, [server.name]: tools }));
      }
    } catch {
      setToolsByServer((prev) => ({ ...prev, [server.name]: [] }));
    } finally {
      setRefreshingServer(null);
    }
  }, []);

  const toggleTool = React.useCallback(
    (serverName: string, toolName: string, enabled: boolean) => {
      setServers((prev) =>
        prev.map((s) => {
          if (s.name !== serverName) return s;
          const current = s.allowed_tools ?? [];
          if (enabled) return { ...s, allowed_tools: [...current, toolName] };
          return { ...s, allowed_tools: current.filter((t) => t !== toolName) };
        }),
      );
    },
    [],
  );

  const openAdd = () => {
    setEditingIndex(null);
    setModalOpen(true);
  };
  const openEdit = (index: number) => {
    setEditingIndex(index);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingIndex(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              MCP Servers
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Enable your agent with capabilities of custom MCP servers.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="p-2 rounded-full bg-agora-accent-blue hover:opacity-90 text-white transition-colors"
            title="Add MCP Server"
          >
            <MdAdd size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {servers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No MCP servers added. Click + to add one.
          </p>
        ) : (
          servers.map((server, index) => {
            const discoveredTools = toolsByServer[server.name] ?? [];
            const allowedSet = new Set(server.allowed_tools ?? []);
            return (
              <div
                key={server.name + index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MdExtension className="text-agora-accent-blue" size={20} />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {server.name}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Configured
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => refreshTools(server)}
                      disabled={refreshingServer === server.name}
                      className="px-2 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
                    >
                      {refreshingServer === server.name ? (
                        <span className="flex items-center gap-1">
                          Loading...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <MdRefresh size={14} /> Refresh Tools
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(index)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      title="Edit"
                    >
                      <MdEdit size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setServers((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="p-2 text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                      title="Remove"
                    >
                      <MdDelete size={18} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {discoveredTools.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Click &quot;Refresh Tools&quot; to fetch available tools,
                      or add tool names manually below.
                    </p>
                  ) : (
                    discoveredTools.map((tool) => (
                      <label
                        key={tool.name}
                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={allowedSet.has(tool.name)}
                          onChange={(e) =>
                            toggleTool(server.name, tool.name, e.target.checked)
                          }
                          className="rounded border-gray-300 dark:border-gray-600 text-agora-accent-blue focus:ring-agora-accent-blue dark:focus:ring-agora-accent-blue"
                        />
                        <MdBuild
                          size={16}
                          className="text-gray-500 dark:text-gray-400 shrink-0"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {tool.name}
                        </span>
                        {tool.description && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                            {tool.description}
                          </span>
                        )}
                      </label>
                    ))
                  )}
                  {discoveredTools.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Check the tools you want the agent to use.
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-agora-accent-blue hover:opacity-90 text-white font-medium rounded-lg transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
      <MCPServerFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSave={(s) => {
          handleAddOrUpdate(s);
          closeModal();
        }}
        initialServer={
          editingIndex !== null ? (servers[editingIndex] ?? null) : null
        }
      />
    </div>
  );
};

// --- Custom Settings tab: JSON override for agent join payload ---
const JOIN_PAYLOAD_MASK = "***MASKED***";

function maskKeysInObject(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  if (out.llm && typeof out.llm === "object") {
    const llm = out.llm as Record<string, unknown>;
    if (String(llm.api_key ?? "").trim()) llm.api_key = JOIN_PAYLOAD_MASK;
  }
  const tts = out.tts as Record<string, unknown> | undefined;
  if (tts?.params && typeof tts.params === "object") {
    const p = tts.params as Record<string, unknown>;
    if (String(p.key ?? "").trim()) p.key = JOIN_PAYLOAD_MASK;
  }
  const asr = out.asr as Record<string, unknown> | undefined;
  if (asr?.params && typeof asr.params === "object") {
    const p = asr.params as Record<string, unknown>;
    if (String(p.api_key ?? "").trim()) p.api_key = JOIN_PAYLOAD_MASK;
    if (String(p.key ?? "").trim()) p.key = JOIN_PAYLOAD_MASK;
  }
  const avatar = out.avatar as Record<string, unknown> | undefined;
  if (avatar?.params && typeof avatar.params === "object") {
    const p = avatar.params as Record<string, unknown>;
    if (String(p.api_key ?? "").trim()) p.api_key = JOIN_PAYLOAD_MASK;
  }
  return out;
}

/** Build a join-payload-shaped preview from agentSettings (channel/token placeholders; keys masked). */
function buildJoinPayloadPreview(settings: AgentSettings | null): string {
  if (!settings) {
    return JSON.stringify(
      {
        name: "agent-1",
        properties: {
          channel: "<channel>",
          token: "<token>",
          llm: {},
          tts: {},
        },
      },
      null,
      2,
    );
  }
  const props: Record<string, unknown> = {
    channel: "<set by server>",
    token: "<set by server>",
    agent_rtc_uid: "0",
    remote_rtc_uids: ["<uid>"],
    enable_string_uid: false,
    idle_timeout: settings.idle_timeout ?? 30,
    llm: settings.llm
      ? {
          ...settings.llm,
          api_key:
            settings.llm.api_key && settings.llm.api_key.trim()
              ? JOIN_PAYLOAD_MASK
              : "",
        }
      : {},
    tts: settings.tts ?? {},
    asr: settings.asr ?? undefined,
    turn_detection: settings.turn_detection ?? undefined,
    advanced_features: settings.advanced_features ?? undefined,
    parameters: settings.parameters ?? undefined,
    avatar: settings.avatar ?? undefined,
  };
  const masked = maskKeysInObject(props);
  return JSON.stringify(
    { name: settings.name ?? "agent-1", properties: masked },
    null,
    2,
  );
}

interface CustomSettingsTabContentProps {
  onClose: () => void;
  useCustomPayload: boolean;
  onDisableCustomPayload: () => void;
  onApplyCustomPayload: (json: string) => void | Promise<void>;
  onBackFromView: () => void;
  isDraftView: boolean;
}

function getMaskedJsonToStore(v: string): string {
  try {
    const parsed = JSON.parse(v) as Record<string, unknown>;
    const props = parsed.properties as Record<string, unknown> | undefined;
    if (props && typeof props === "object") {
      return JSON.stringify(
        { ...parsed, properties: maskKeysInObject(props) },
        null,
        2,
      );
    }
  } catch {
    // ignore
  }
  return v;
}

const CustomSettingsTabContent: React.FC<CustomSettingsTabContentProps> = ({
  useCustomPayload,
  onDisableCustomPayload,
  onApplyCustomPayload,
  onBackFromView,
  isDraftView,
}) => {
  const agentSettings = useAppStore((state) => state.agentSettings);
  const [customPayloadJson, setCustomPayloadJson] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);

  // Draft view: always show current agent settings (live). Applied view: load from IDB.
  React.useEffect(() => {
    if (isDraftView) {
      setCustomPayloadJson(buildJoinPayloadPreview(agentSettings));
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const stored = await import("@/services/settingsDb").then((m) =>
        m.getCustomAgentSettings(),
      );
      if (cancelled) return;
      if (stored?.customPayloadJson?.trim()) {
        setCustomPayloadJson(stored.customPayloadJson);
      } else {
        setCustomPayloadJson(buildJoinPayloadPreview(agentSettings));
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isDraftView, agentSettings]);

  const handleJsonChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCustomPayloadJson(e.target.value);
    },
    [],
  );

  const handleSaveDraft = React.useCallback(() => {
    const toStore = getMaskedJsonToStore(customPayloadJson);
    import("@/services/settingsDb").then((m) =>
      m.setCustomAgentSettings({
        useCustomPayload: useCustomPayload,
        customPayloadJson: toStore,
      }),
    );
    showToast("Custom settings draft saved.", "success");
  }, [customPayloadJson, useCustomPayload]);

  const handleApply = React.useCallback(() => {
    const toStore = getMaskedJsonToStore(customPayloadJson);
    onApplyCustomPayload(toStore);
  }, [customPayloadJson, onApplyCustomPayload]);

  return (
    <div className="flex flex-col flex-1 min-h-0 px-6 py-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex-shrink-0">
        {useCustomPayload
          ? "Custom payload is applied. Use Back to agent settings below to edit AI Agent, Voice, and MCP from tabs again."
          : isDraftView
            ? "Edit your custom join payload below. Save draft to keep without applying, or Apply to use it for the agent (disables normal tabs)."
            : "Edit the custom join payload (Agora Conversational AI join API)."}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3 flex-shrink-0">
        <button
          type="button"
          onClick={handleSaveDraft}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Save draft
        </button>
        {isDraftView && (
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-agora-accent-blue text-white hover:opacity-90 transition-opacity"
          >
            Apply custom settings
          </button>
        )}
      </div>

      <textarea
        className="flex-1 min-h-[200px] w-full px-3 py-2 font-mono text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-agora-accent-blue focus:border-transparent resize-none"
        value={customPayloadJson}
        onChange={handleJsonChange}
        placeholder='{ "name": "agent-1", "properties": { ... } }'
        spellCheck={false}
      />
    </div>
  );
};

// Bot icon
const BotIcon: React.FC<{ className?: string; size?: number }> = ({
  className = "",
  size = 24,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
  >
    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-3 9a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1z" />
  </svg>
);

// Agent settings content component (embedded version)
const AgentSettingsSidebarContent: React.FC<{
  onSave: (settings: AgentSettingsType) => void;
  onClose: () => void;
  isAgentActive?: boolean;
}> = ({ onSave, onClose, isAgentActive = false }) => {
  const existingSettings = useAppStore((state) => state.agentSettings);
  const [settings, setSettings] = React.useState<AgentSettingsType>(
    existingSettings || getDefaultSettings(),
  );
  const [expandedSections, setExpandedSections] = React.useState<
    Record<SectionKey, boolean>
  >({
    llm: true,
    tts: true,
    asr: false,
    avatar: true,
    advanced: false,
  });
  const [selectedLLMVendor, setSelectedLLMVendor] = React.useState<LLMVendor>(
    (getEnvVar("LLM_VENDOR", "openai") as LLMVendor) || "openai",
  );
  const [selectedTTSVendor, setSelectedTTSVendor] = React.useState<TTSVendor>(
    getDefaultTTSVendor(),
  );
  const [selectedASRVendor, setSelectedASRVendor] = React.useState<ASRVendor>(
    getDefaultASRVendor(),
  );
  const [selectedAvatarVendor, setSelectedAvatarVendor] =
    React.useState<AvatarVendor>("heygen");

  React.useEffect(() => {
    if (existingSettings) {
      setSettings(existingSettings);
      if (existingSettings.avatar?.vendor) {
        setSelectedAvatarVendor(existingSettings.avatar.vendor);
      }
    }
  }, [existingSettings]);

  const toggleSection = (key: SectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateLLM = (updates: Partial<LLMConfig>) => {
    setSettings((prev) => ({
      ...prev,
      llm: { ...prev.llm, ...updates },
    }));
  };

  const updateTTS = (updates: Partial<TTSConfig>) => {
    setSettings((prev) => ({
      ...prev,
      tts: { ...prev.tts, ...updates } as TTSConfig,
    }));
  };

  const updateASR = (updates: Partial<ASRConfig>) => {
    setSettings((prev) => ({
      ...prev,
      asr: { ...prev.asr, ...updates },
    }));
  };

  const updateAvatar = (updates: Partial<AvatarConfig>) => {
    setSettings((prev) => ({
      ...prev,
      avatar: {
        enable: false,
        vendor: "heygen",
        params: getDefaultAvatarParams("heygen"),
        ...prev.avatar,
        ...updates,
      } as AvatarConfig,
    }));
  };

  const handleAvatarVendorChange = (vendor: AvatarVendor) => {
    setSelectedAvatarVendor(vendor);
    updateAvatar({ vendor, params: getDefaultAvatarParams(vendor) });
  };

  const handleLLMVendorChange = (vendor: LLMVendor) => {
    setSelectedLLMVendor(vendor);
    const preset = LLM_PRESETS[vendor];
    updateLLM({
      url: preset.url || "",
      style: preset.style,
      headers: preset.headers,
      params: {
        ...settings.llm.params,
        model: preset.defaultModel || "",
      },
    });
  };

  const handleTTSVendorChange = (vendor: TTSVendor) => {
    setSelectedTTSVendor(vendor);
    const defaultParams: Record<string, unknown> = { key: "" };

    if (vendor === "microsoft") {
      Object.assign(defaultParams, {
        region: "eastus",
        voice_name: "en-US-AndrewMultilingualNeural",
        speed: 1.0,
        volume: 100,
      });
    } else if (vendor === "elevenlabs") {
      Object.assign(defaultParams, {
        model_id: "eleven_flash_v2_5",
        voice_id: "",
        speed: 1.0,
      });
    } else if (vendor === "openai") {
      Object.assign(defaultParams, {
        model: "tts-1",
        voice: "alloy",
        speed: 1.0,
      });
    }

    updateTTS({ vendor, params: defaultParams });
  };

  const handleASRVendorChange = (vendor: ASRVendor) => {
    setSelectedASRVendor(vendor);
    const defaultParams: Record<string, unknown> = {};

    if (vendor === "microsoft") {
      Object.assign(defaultParams, {
        key: "",
        region: "eastus",
        language: settings.asr?.language || "en-US",
      });
    } else if (vendor === "deepgram") {
      Object.assign(defaultParams, {
        key: "",
        model: "nova-3",
        language: "en",
      });
    }

    updateASR({
      vendor,
      params: Object.keys(defaultParams).length ? defaultParams : undefined,
    });
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const getTTSParam = (key: string): string => {
    const params = settings.tts.params as Record<string, unknown>;
    return (params[key] as string) || "";
  };

  const setTTSParam = (key: string, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      tts: {
        ...prev.tts,
        params: {
          ...(prev.tts.params as Record<string, unknown>),
          [key]: value,
        },
      },
    }));
  };

  const getASRParam = (key: string): string => {
    const params = (settings.asr?.params || {}) as Record<string, unknown>;
    return (params[key] as string) || "";
  };

  const setASRParam = (key: string, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      asr: {
        ...prev.asr,
        params: {
          ...((prev.asr?.params || {}) as Record<string, unknown>),
          [key]: value,
        },
      },
    }));
  };

  const getAvatarParam = (key: string): string => {
    if (!settings.avatar?.params) return "";
    const params = settings.avatar.params as unknown as Record<string, unknown>;
    return (params[key] as string) || "";
  };

  const setAvatarParam = (key: string, value: unknown) => {
    setSettings((prev) => {
      if (!prev.avatar) return prev;
      const currentParams = prev.avatar.params as unknown as Record<
        string,
        unknown
      >;
      const newParams = { ...currentParams, [key]: value };
      return {
        ...prev,
        avatar: {
          ...prev.avatar,
          params: newParams as unknown as
            | AvatarAkoolParams
            | AvatarHeyGenParams,
        },
      };
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
        {/* Info banner - which changes apply live vs require restart */}
        {isAgentActive && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1.5">
              When agent is running:
            </p>
            <ul className="text-xs text-agora-accent-blue space-y-0.5">
              <li>
                • <strong>Auto-update (no restart):</strong> LLM and MLLM params
                (system prompt, model, params)
              </li>
              <li>
                • <strong>Manual restart required:</strong> All advanced
                settings (TTS, ASR, turn detection, RTM, MLLM toggle, tools)
              </li>
            </ul>
          </div>
        )}

        {/* Agent Name */}
        <FormField
          label="Agent Name"
          required
          hint="Unique identifier for this agent instance"
          tooltip="Unique identifier for this agent instance."
        >
          <Input
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            placeholder="my-agent-001"
          />
        </FormField>

        {/* LLM Section */}
        <Section
          title="LLM Configuration"
          icon={<BotIcon size={20} />}
          isOpen={expandedSections.llm}
          onToggle={() => toggleSection("llm")}
          badge="Required"
        >
          <FormField
            label="Provider"
            required
            tooltip="LLM provider selection."
          >
            <Select
              value={selectedLLMVendor}
              onChange={(e) =>
                handleLLMVendorChange(e.target.value as LLMVendor)
              }
            >
              {Object.entries(LLM_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="API URL" required tooltip="LLM callback endpoint.">
            <Input
              value={settings.llm.url}
              onChange={(e) => updateLLM({ url: e.target.value })}
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </FormField>

          <FormField
            label="API Key"
            required
            tooltip="Verification key for the LLM."
          >
            <Input
              type="password"
              value={settings.llm.api_key}
              onChange={(e) => updateLLM({ api_key: e.target.value })}
              placeholder="sk-..."
            />
          </FormField>

          <FormField
            label="Model"
            required
            tooltip="Model name for the selected LLM vendor."
          >
            {LLM_PRESETS[selectedLLMVendor].models ? (
              <Select
                value={settings.llm.params?.model || ""}
                onChange={(e) =>
                  updateLLM({
                    params: { ...settings.llm.params, model: e.target.value },
                  })
                }
              >
                {LLM_PRESETS[selectedLLMVendor].models!.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={settings.llm.params?.model || ""}
                onChange={(e) =>
                  updateLLM({
                    params: { ...settings.llm.params, model: e.target.value },
                  })
                }
                placeholder="Model name"
              />
            )}
          </FormField>

          <FormField
            label="System Prompt"
            hint="Defines the agent's personality and behavior"
            tooltip="Predefined context for the LLM."
          >
            <Textarea
              rows={4}
              value={settings.llm.system_messages?.[0]?.content || ""}
              onChange={(e) =>
                updateLLM({
                  system_messages: [
                    { role: "system", content: e.target.value },
                  ],
                })
              }
              placeholder="You are a helpful AI assistant..."
            />
          </FormField>

          <FormField
            label="Greeting Message"
            hint="What the agent says when joining"
            tooltip="Message spoken when the agent joins."
          >
            <Input
              value={settings.llm.greeting_message || ""}
              onChange={(e) => updateLLM({ greeting_message: e.target.value })}
              placeholder="Hello! How can I help you?"
            />
          </FormField>

          <FormField
            label="Failure Message"
            hint="Fallback when there's an error"
            tooltip="Fallback when the LLM call fails."
          >
            <Input
              value={settings.llm.failure_message || ""}
              onChange={(e) => updateLLM({ failure_message: e.target.value })}
              placeholder="I'm sorry, could you repeat that?"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Max History"
              hint="1-1024"
              tooltip="Conversation history size (1-1024)."
            >
              <Input
                type="number"
                min={1}
                max={1024}
                value={settings.llm.max_history || 10}
                onChange={(e) =>
                  updateLLM({ max_history: parseInt(e.target.value) || 10 })
                }
              />
            </FormField>
            <FormField label="Temperature" hint="0-2">
              <Input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={settings.llm.params?.temperature || 0.7}
                onChange={(e) =>
                  updateLLM({
                    params: {
                      model: settings.llm.params?.model || "",
                      ...settings.llm.params,
                      temperature: parseFloat(e.target.value),
                    },
                  })
                }
              />
            </FormField>
          </div>
        </Section>

        {/* TTS Section */}
        <Section
          title="TTS (Text-to-Speech)"
          icon={<MdRecordVoiceOver size={20} />}
          isOpen={expandedSections.tts}
          onToggle={() => toggleSection("tts")}
          badge="Required"
        >
          <FormField label="Vendor" required>
            <Select
              value={selectedTTSVendor}
              onChange={(e) =>
                handleTTSVendorChange(e.target.value as TTSVendor)
              }
            >
              {Object.entries(TTS_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="API Key"
            required
            hint="Leave empty to use server-configured key (ELEVENLABS_API_KEY / MICROSOFT_TTS_KEY / OPENAI_TTS_KEY in .env)"
          >
            <Input
              type="password"
              value={maskKeyForDisplay(getTTSParam("key"))}
              onChange={(e) =>
                keyChange(e.target.value, getTTSParam("key"), (k) =>
                  setTTSParam("key", k),
                )
              }
              placeholder="Leave empty for server key, or enter your TTS API key"
            />
          </FormField>

          {/* Microsoft TTS specific fields */}
          {selectedTTSVendor === "microsoft" && (
            <>
              <FormField label="Region" required hint="e.g., eastus, westus2">
                <Input
                  value={getTTSParam("region")}
                  onChange={(e) => setTTSParam("region", e.target.value)}
                  placeholder="eastus"
                />
              </FormField>
              <FormField label="Voice Name" required>
                <Select
                  value={getTTSParam("voice_name")}
                  onChange={(e) => setTTSParam("voice_name", e.target.value)}
                >
                  {TTS_PRESETS.microsoft.voices?.map((voice) => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ))}
                  <option value="">Custom...</option>
                </Select>
                {!getTTSParam("voice_name") && (
                  <Input
                    className="mt-2"
                    value={getTTSParam("voice_name")}
                    onChange={(e) => setTTSParam("voice_name", e.target.value)}
                    placeholder="Custom voice name"
                  />
                )}
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Speed" hint="0.5-2.0">
                  <Input
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={getTTSParam("speed") || "1.0"}
                    onChange={(e) =>
                      setTTSParam("speed", parseFloat(e.target.value))
                    }
                  />
                </FormField>
                <FormField label="Volume" hint="0-100">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={getTTSParam("volume") || "100"}
                    onChange={(e) =>
                      setTTSParam("volume", parseInt(e.target.value))
                    }
                  />
                </FormField>
              </div>
            </>
          )}

          {/* ElevenLabs specific fields */}
          {selectedTTSVendor === "elevenlabs" && (
            <>
              <FormField label="Model" required>
                <Select
                  value={getTTSParam("model_id")}
                  onChange={(e) => setTTSParam("model_id", e.target.value)}
                >
                  {TTS_PRESETS.elevenlabs.models?.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Voice ID"
                required
                hint="From ElevenLabs voice library"
              >
                <Input
                  value={getTTSParam("voice_id")}
                  onChange={(e) => setTTSParam("voice_id", e.target.value)}
                  placeholder="pNInz6obpgDQGcFmaJgB"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Speed" hint="0.7-1.2">
                  <Input
                    type="number"
                    min={0.7}
                    max={1.2}
                    step={0.1}
                    value={getTTSParam("speed") || "1.0"}
                    onChange={(e) =>
                      setTTSParam("speed", parseFloat(e.target.value))
                    }
                  />
                </FormField>
                <FormField label="Stability" hint="0-1">
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={getTTSParam("stability") || "0.5"}
                    onChange={(e) =>
                      setTTSParam("stability", parseFloat(e.target.value))
                    }
                  />
                </FormField>
              </div>
            </>
          )}

          {/* OpenAI TTS specific fields */}
          {selectedTTSVendor === "openai" && (
            <>
              <FormField label="Model" required>
                <Select
                  value={getTTSParam("model")}
                  onChange={(e) => setTTSParam("model", e.target.value)}
                >
                  {TTS_PRESETS.openai.models?.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Voice" required>
                <Select
                  value={getTTSParam("voice")}
                  onChange={(e) => setTTSParam("voice", e.target.value)}
                >
                  {TTS_PRESETS.openai.voices?.map((voice) => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ))}
                </Select>
              </FormField>
            </>
          )}
        </Section>

        {/* ASR Section */}
        <Section
          title="ASR (Speech Recognition)"
          icon={<MdGraphicEq size={20} />}
          isOpen={expandedSections.asr}
          onToggle={() => toggleSection("asr")}
        >
          <FormField
            label="Vendor"
            hint="ARES is Agora's built-in ASR (no API key needed)"
          >
            <Select
              value={selectedASRVendor}
              onChange={(e) =>
                handleASRVendorChange(e.target.value as ASRVendor)
              }
            >
              {Object.entries(ASR_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Language" required>
            <Select
              value={settings.asr?.language || "en-US"}
              onChange={(e) => updateASR({ language: e.target.value })}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label} ({lang.code})
                </option>
              ))}
            </Select>
          </FormField>

          {/* Vendor-specific ASR fields */}
          {selectedASRVendor === "microsoft" && (
            <>
              <FormField label="API Key" required>
                <Input
                  type="password"
                  value={getASRParam("key")}
                  onChange={(e) => setASRParam("key", e.target.value)}
                  placeholder="Azure Speech API key"
                />
              </FormField>
              <FormField label="Region" required>
                <Input
                  value={getASRParam("region")}
                  onChange={(e) => setASRParam("region", e.target.value)}
                  placeholder="eastus"
                />
              </FormField>
            </>
          )}

          {selectedASRVendor === "deepgram" && (
            <>
              <FormField label="API Key" required>
                <Input
                  type="password"
                  value={getASRParam("key")}
                  onChange={(e) => setASRParam("key", e.target.value)}
                  placeholder="Deepgram API key"
                />
              </FormField>
              <FormField label="Model">
                <Select
                  value={getASRParam("model") || "nova-3"}
                  onChange={(e) => setASRParam("model", e.target.value)}
                >
                  {ASR_PRESETS.deepgram.models?.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </Select>
              </FormField>
            </>
          )}
        </Section>

        {/* AI Avatar Section */}
        <Section
          title="AI Avatar (Optional)"
          icon={<MdFace size={20} />}
          isOpen={expandedSections.avatar}
          onToggle={() => toggleSection("avatar")}
          badge="Optional"
        >
          <Toggle
            label="Enable Avatar"
            checked={settings.avatar?.enable || false}
            onChange={(checked) =>
              updateAvatar({
                enable: checked,
                vendor: settings.avatar?.vendor || selectedAvatarVendor,
                params:
                  settings.avatar?.params ||
                  getDefaultAvatarParams(selectedAvatarVendor),
              })
            }
            hint="Enable AI avatar for visual representation of the agent"
          />

          {settings.avatar?.enable && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> When avatar is enabled, the agent
                subscribes only to your UID (not all participants). This is
                required by Agora when using AI avatars.
              </p>
            </div>
          )}

          <FormField
            label="Vendor"
            required
            tooltip="Avatar provider selection."
          >
            <Select
              value={selectedAvatarVendor}
              onChange={(e) =>
                handleAvatarVendorChange(e.target.value as AvatarVendor)
              }
            >
              {Object.entries(AVATAR_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Important:</strong>{" "}
              {selectedAvatarVendor === "akool"
                ? "Akool requires TTS with 16kHz sample rate (e.g., Microsoft Azure TTS)"
                : "HeyGen requires TTS with 24kHz sample rate (e.g., ElevenLabs or OpenAI TTS)"}
            </p>
          </div>

          <FormField
            label="API Key"
            required
            hint="Leave empty to use server-configured key (HEYGEN_API_KEY / AKOOL_API_KEY in .env)"
          >
            <Input
              type="password"
              value={maskKeyForDisplay(getAvatarParam("api_key"))}
              onChange={(e) =>
                keyChange(e.target.value, getAvatarParam("api_key"), (k) =>
                  setAvatarParam("api_key", k),
                )
              }
              placeholder={
                selectedAvatarVendor === "akool"
                  ? "Leave empty for server key, or enter Akool API key"
                  : "Leave empty for server key, or enter HeyGen API key"
              }
            />
          </FormField>

          {selectedAvatarVendor === "akool" && (
            <FormField
              label="Avatar ID"
              required
              hint="Find available avatar IDs in your Akool dashboard"
              tooltip="Unique identifier for the Akool avatar."
            >
              <Input
                value={getAvatarParam("avatar_id")}
                onChange={(e) => setAvatarParam("avatar_id", e.target.value)}
                placeholder="Akool avatar ID"
              />
            </FormField>
          )}

          {selectedAvatarVendor === "heygen" && (
            <>
              <FormField
                label="Quality"
                required
                tooltip="Video quality: low (360p), medium (480p), high (720p)"
              >
                <Select
                  value={getAvatarParam("quality") || "medium"}
                  onChange={(e) => setAvatarParam("quality", e.target.value)}
                >
                  <option value="low">Low (360p)</option>
                  <option value="medium">Medium (480p)</option>
                  <option value="high">High (720p)</option>
                </Select>
              </FormField>

              <FormField
                label="Avatar"
                required
                hint="Choose a HeyGen avatar character"
              >
                <Select
                  value={
                    getAvatarParam("avatar_id") || HEYGEN_DEFAULT_AVATAR_ID
                  }
                  onChange={(e) => setAvatarParam("avatar_id", e.target.value)}
                >
                  {HEYGEN_AVATAR_GROUPS.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Activity Idle Timeout (seconds)"
                hint="Default: 60 seconds"
              >
                <Input
                  type="number"
                  min={0}
                  max={300}
                  value={getAvatarParam("activity_idle_timeout") || "60"}
                  onChange={(e) =>
                    setAvatarParam(
                      "activity_idle_timeout",
                      parseInt(e.target.value) || 60,
                    )
                  }
                />
              </FormField>

              <Toggle
                label="Disable Idle Timeout"
                checked={(() => {
                  if (!settings.avatar?.params) return false;
                  const params = settings.avatar.params as unknown as Record<
                    string,
                    unknown
                  >;
                  const val = params["disable_idle_timeout"];
                  return val === true || val === "true";
                })()}
                onChange={(checked) =>
                  setAvatarParam("disable_idle_timeout", checked)
                }
                hint="Disable automatic timeout when inactive"
              />
            </>
          )}
        </Section>

        {/* Advanced Section */}
        <Section
          title="Advanced Settings"
          icon={<MdTune size={20} />}
          isOpen={expandedSections.advanced}
          onToggle={() => toggleSection("advanced")}
        >
          <FormField
            label="Idle Timeout (seconds)"
            hint="Auto-exit when users leave"
            tooltip="Seconds before agent exits when users leave."
          >
            <Input
              type="number"
              min={10}
              max={300}
              value={settings.idle_timeout || 30}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  idle_timeout: parseInt(e.target.value) || 30,
                })
              }
            />
          </FormField>

          <FormField
            label="Silence Duration (ms)"
            hint="Wait before processing response"
            tooltip="Milliseconds of silence before processing."
          >
            <Input
              type="number"
              min={100}
              max={2000}
              step={100}
              value={settings.turn_detection?.silence_duration_ms || 500}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  turn_detection: {
                    ...settings.turn_detection,
                    silence_duration_ms: parseInt(e.target.value) || 500,
                  },
                })
              }
            />
          </FormField>

          <FormField
            label="VAD Mode"
            tooltip="server_vad or semantic turn detection."
          >
            <Select
              value={settings.turn_detection?.mode || "server_vad"}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  turn_detection: {
                    ...settings.turn_detection,
                    mode: e.target.value as "server_vad" | "semantic",
                  },
                })
              }
            >
              <option value="server_vad">Server VAD</option>
              <option value="semantic">Semantic</option>
            </Select>
          </FormField>

          <div className="border-t border-gray-200 dark:border-gray-700 my-4 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Features
            </h4>
            <Toggle
              label="Enable MLLM (Vision)"
              checked={settings.advanced_features?.enable_mllm || false}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  advanced_features: {
                    ...settings.advanced_features,
                    enable_mllm: checked,
                  },
                })
              }
              hint="Multimodal LLM for vision."
            />
            <Toggle
              label="Enable RTM"
              checked={settings.advanced_features?.enable_rtm || false}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  advanced_features: {
                    ...settings.advanced_features,
                    enable_rtm: checked,
                  },
                })
              }
              hint="Enables Signaling; use RTM for transcripts, state, chat."
            />
            <Toggle
              label="Enable Tools"
              checked={settings.advanced_features?.enable_tools || false}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  advanced_features: {
                    ...settings.advanced_features,
                    enable_tools: checked,
                  },
                })
              }
              hint="Function calling support."
            />
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-agora-accent-blue hover:opacity-90 text-white font-medium rounded-lg transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-3">
          Fields marked with{" "}
          <span className="text-red-500 dark:text-red-400">*</span> are required
        </p>
      </div>
    </div>
  );
};

export default SettingsSidebar;
