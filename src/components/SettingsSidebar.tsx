"use client";

import React, { useState } from "react";
import { MdClose, MdSmartToy, MdMic } from "react-icons/md";
import AgentSettingsSidebar from "./AgentSettingsSidebar";
import VoiceSettings from "./VoiceSettings";
import useAppStore from "@/store/useAppStore";
import type { AgentSettings } from "@/types/agora";
import type { IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

type SettingsTab = "ai-agent" | "voice";

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAgentSettings: (settings: AgentSettings) => void;
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
        ? "bg-blue-500 text-white dark:bg-blue-600"
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
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai-agent");
  const localAudioTrack = useAppStore((state) => state.localAudioTrack);

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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configure your meeting preferences</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MdClose className="text-gray-500 dark:text-gray-400" size={24} />
          </button>
        </div>

        {/* Tabs */}
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "ai-agent" ? (
            <AgentSettingsContent onSave={onSaveAgentSettings} onClose={onClose} />
          ) : (
            <div className="px-6 py-4">
              <VoiceSettings localMicrophoneTrack={microphoneTrackInterface} />
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
}

const AgentSettingsContent: React.FC<AgentSettingsContentProps> = ({ onSave, onClose }) => {
  // We'll render AgentSettingsSidebar but need to extract just the content
  // For now, we'll use the full sidebar but hide the outer wrapper via a prop
  return (
    <AgentSettingsSidebarContent onSave={onSave} onClose={onClose} />
  );
};

// This is a simplified inline version - we need to refactor AgentSettingsSidebar
// to export its content separately. For now, let's create an embedded version.
import {
  AgentSettings as AgentSettingsType,
  LLMVendor,
  TTSVendor,
  ASRVendor,
  LLMConfig,
  TTSConfig,
  ASRConfig,
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
} from "react-icons/md";

// Section collapse state
type SectionKey = "llm" | "tts" | "asr" | "advanced";

// Environment variable helpers
const ENV_MAP: Record<string, string | undefined> = {
  LLM_VENDOR: process.env.NEXT_PUBLIC_LLM_VENDOR,
  TTS_VENDOR: process.env.NEXT_PUBLIC_TTS_VENDOR,
  ASR_VENDOR: process.env.NEXT_PUBLIC_ASR_VENDOR,
  LLM_URL: process.env.NEXT_PUBLIC_LLM_URL,
  LLM_API_KEY: process.env.NEXT_PUBLIC_LLM_API_KEY,
  LLM_MODEL: process.env.NEXT_PUBLIC_LLM_MODEL,
  MICROSOFT_TTS_KEY: process.env.NEXT_PUBLIC_MICROSOFT_TTS_KEY,
  MICROSOFT_TTS_REGION: process.env.NEXT_PUBLIC_MICROSOFT_TTS_REGION,
  MICROSOFT_TTS_VOICE: process.env.NEXT_PUBLIC_MICROSOFT_TTS_VOICE,
  ELEVENLABS_API_KEY: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
  ELEVENLABS_VOICE_ID: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
  ELEVENLABS_MODEL_ID: process.env.NEXT_PUBLIC_ELEVENLABS_MODEL_ID,
  ELEVENLABS_SAMPLE_RATE: process.env.NEXT_PUBLIC_ELEVENLABS_SAMPLE_RATE,
  OPENAI_TTS_KEY: process.env.NEXT_PUBLIC_OPENAI_TTS_KEY,
  OPENAI_TTS_MODEL: process.env.NEXT_PUBLIC_OPENAI_TTS_MODEL,
  OPENAI_TTS_VOICE: process.env.NEXT_PUBLIC_OPENAI_TTS_VOICE,
  DEEPGRAM_API_KEY: process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY,
  DEEPGRAM_URL: process.env.NEXT_PUBLIC_DEEPGRAM_URL,
  DEEPGRAM_MODEL: process.env.NEXT_PUBLIC_DEEPGRAM_MODEL,
  DEEPGRAM_LANGUAGE: process.env.NEXT_PUBLIC_DEEPGRAM_LANGUAGE,
  MICROSOFT_ASR_KEY: process.env.NEXT_PUBLIC_MICROSOFT_ASR_KEY,
  MICROSOFT_ASR_REGION: process.env.NEXT_PUBLIC_MICROSOFT_ASR_REGION,
  ASR_LANGUAGE: process.env.NEXT_PUBLIC_ASR_LANGUAGE,
};

const getEnvVar = (key: string, defaultValue: string = ""): string => {
  return ENV_MAP[key] || defaultValue;
};

const getDefaultTTSVendor = (): TTSVendor => {
  const vendor = getEnvVar("TTS_VENDOR", "microsoft");
  if (vendor === "elevenlabs" || vendor === "openai" || vendor === "microsoft") {
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
  switch (vendor) {
    case "elevenlabs":
      return {
        key: getEnvVar("ELEVENLABS_API_KEY"),
        voice_id: getEnvVar("ELEVENLABS_VOICE_ID"),
        model_id: getEnvVar("ELEVENLABS_MODEL_ID", "eleven_flash_v2_5"),
        sample_rate: parseInt(getEnvVar("ELEVENLABS_SAMPLE_RATE", "24000"), 10),
        speed: 1.0,
      };
    case "openai":
      return {
        key: getEnvVar("OPENAI_TTS_KEY"),
        model: getEnvVar("OPENAI_TTS_MODEL", "tts-1"),
        voice: getEnvVar("OPENAI_TTS_VOICE", "alloy"),
        speed: 1.0,
      };
    case "microsoft":
    default:
      return {
        key: getEnvVar("MICROSOFT_TTS_KEY"),
        region: getEnvVar("MICROSOFT_TTS_REGION", "eastus"),
        voice_name: getEnvVar("MICROSOFT_TTS_VOICE", "en-US-AndrewMultilingualNeural"),
        speed: 1.0,
        volume: 100,
      };
  }
};

const getDefaultASRConfig = (vendor: ASRVendor): ASRConfig => {
  const language = getEnvVar("ASR_LANGUAGE", "en-US");

  switch (vendor) {
    case "deepgram":
      return {
        vendor: "deepgram",
        language,
        params: {
          api_key: getEnvVar("DEEPGRAM_API_KEY"),
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
          key: getEnvVar("MICROSOFT_ASR_KEY"),
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

const getDefaultSettings = (): AgentSettingsType => {
  const ttsVendor = getDefaultTTSVendor();
  const asrVendor = getDefaultASRVendor();

  return {
    name: `agent-${Date.now()}`,
    llm: {
      url: getEnvVar("LLM_URL", LLM_PRESETS.openai.url!),
      api_key: getEnvVar("LLM_API_KEY"),
      system_messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant in a video call. Be concise, friendly, and conversational.",
        },
      ],
      greeting_message: "Hello! I'm your AI assistant. How can I help you today?",
      failure_message: "I'm sorry, I didn't catch that. Could you please repeat?",
      max_history: 10,
      style: "openai",
      params: {
        model: getEnvVar("LLM_MODEL", "gpt-4o-mini"),
      },
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
        {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
      </span>
      {tooltip && <InfoTooltip content={tooltip} />}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{hint}</p>}
  </div>
);

const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
> = ({ error, className = "", ...props }) => (
  <input
    {...props}
    className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white text-sm
      placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
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
      focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors
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
      placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
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
        <span className="text-blue-500 dark:text-blue-400">{icon}</span>
        <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        {badge && (
          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">
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
    {isOpen && <div className="px-4 py-4 bg-gray-50 dark:bg-gray-900/50">{children}</div>}
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
        checked ? "bg-blue-500 dark:bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
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

// Bot icon
const BotIcon: React.FC<{ className?: string; size?: number }> = ({ className = "", size = 24 }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className}>
    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-3 9a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1z" />
  </svg>
);

// Agent settings content component (embedded version)
const AgentSettingsSidebarContent: React.FC<{
  onSave: (settings: AgentSettingsType) => void;
  onClose: () => void;
}> = ({ onSave, onClose }) => {
  const existingSettings = useAppStore((state) => state.agentSettings);
  const [settings, setSettings] = React.useState<AgentSettingsType>(
    existingSettings || getDefaultSettings()
  );
  const [expandedSections, setExpandedSections] = React.useState<Record<SectionKey, boolean>>({
    llm: true,
    tts: true,
    asr: false,
    advanced: false,
  });
  const [selectedLLMVendor, setSelectedLLMVendor] = React.useState<LLMVendor>(
    (getEnvVar("LLM_VENDOR", "openai") as LLMVendor) || "openai"
  );
  const [selectedTTSVendor, setSelectedTTSVendor] = React.useState<TTSVendor>(getDefaultTTSVendor());
  const [selectedASRVendor, setSelectedASRVendor] = React.useState<ASRVendor>(getDefaultASRVendor());

  React.useEffect(() => {
    if (existingSettings) {
      setSettings(existingSettings);
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

    updateASR({ vendor, params: Object.keys(defaultParams).length ? defaultParams : undefined });
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
        params: { ...(prev.tts.params as Record<string, unknown>), [key]: value },
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
        params: { ...((prev.asr?.params || {}) as Record<string, unknown>), [key]: value },
      },
    }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
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
          <FormField label="Provider" required tooltip="LLM provider selection.">
            <Select
              value={selectedLLMVendor}
              onChange={(e) => handleLLMVendorChange(e.target.value as LLMVendor)}
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

          <FormField label="API Key" required tooltip="Verification key for the LLM.">
            <Input
              type="password"
              value={settings.llm.api_key}
              onChange={(e) => updateLLM({ api_key: e.target.value })}
              placeholder="sk-..."
            />
          </FormField>

          <FormField label="Model" required tooltip="Model name for the selected LLM vendor.">
            {LLM_PRESETS[selectedLLMVendor].models ? (
              <Select
                value={settings.llm.params?.model || ""}
                onChange={(e) =>
                  updateLLM({ params: { ...settings.llm.params, model: e.target.value } })
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
                  updateLLM({ params: { ...settings.llm.params, model: e.target.value } })
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
                  system_messages: [{ role: "system", content: e.target.value }],
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
            <FormField label="Max History" hint="1-1024" tooltip="Conversation history size (1-1024).">
              <Input
                type="number"
                min={1}
                max={1024}
                value={settings.llm.max_history || 10}
                onChange={(e) => updateLLM({ max_history: parseInt(e.target.value) || 10 })}
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
              onChange={(e) => handleTTSVendorChange(e.target.value as TTSVendor)}
            >
              {Object.entries(TTS_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="API Key" required>
            <Input
              type="password"
              value={getTTSParam("key")}
              onChange={(e) => setTTSParam("key", e.target.value)}
              placeholder="Your TTS API key"
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
                    onChange={(e) => setTTSParam("speed", parseFloat(e.target.value))}
                  />
                </FormField>
                <FormField label="Volume" hint="0-100">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={getTTSParam("volume") || "100"}
                    onChange={(e) => setTTSParam("volume", parseInt(e.target.value))}
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
              <FormField label="Voice ID" required hint="From ElevenLabs voice library">
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
                    onChange={(e) => setTTSParam("speed", parseFloat(e.target.value))}
                  />
                </FormField>
                <FormField label="Stability" hint="0-1">
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={getTTSParam("stability") || "0.5"}
                    onChange={(e) => setTTSParam("stability", parseFloat(e.target.value))}
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
          <FormField label="Vendor" hint="ARES is Agora's built-in ASR (no API key needed)">
            <Select
              value={selectedASRVendor}
              onChange={(e) => handleASRVendorChange(e.target.value as ASRVendor)}
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
                setSettings({ ...settings, idle_timeout: parseInt(e.target.value) || 30 })
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

          <FormField label="VAD Mode" tooltip="server_vad or semantic turn detection.">
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
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Features</h4>
            <Toggle
              label="Enable MLLM (Vision)"
              checked={settings.advanced_features?.enable_mllm || false}
              onChange={(checked) =>
                setSettings({
                  ...settings,
                  advanced_features: { ...settings.advanced_features, enable_mllm: checked },
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
                  advanced_features: { ...settings.advanced_features, enable_rtm: checked },
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
                  advanced_features: { ...settings.advanced_features, enable_tools: checked },
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
            className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Save & Apply
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-3">
          Fields marked with <span className="text-red-500 dark:text-red-400">*</span> are required
        </p>
      </div>
    </div>
  );
};

export default SettingsSidebar;
