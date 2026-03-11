// src/types/podcast.ts

import type { EAgentState } from "@/types/agora";

// --- Podcast Status ---
export type PodcastStatus =
  | "idle"
  | "setting-up"
  | "loading"
  | "live"
  | "wrapping-up"
  | "ended";

// --- Themes ---
export interface PodcastTheme {
  id: string;
  name: string;
  cssGradient: string;
  ambienceAudio?: string;
  accentColor: string;
  lightingFilter: string;
}

export interface LightingPreset {
  id: string;
  name: string;
  cssFilter: string;
}

// --- Avatars ---
export interface PodcastAvatarConfig {
  id: string;
  name: string;
  anamAvatarId: string;
  role: "host" | "guest";
  defaultVoiceName: string;
}

// --- Session ---
export interface PodcastSession {
  sessionId: string;
  channel: string;
  uid: number;
  rtcToken: string;
  rtmToken: string;
  hostAgentId: string | null;
  guestAgentId: string | null;
  hostRtcUid: number;
  guestRtcUid: number;
  hostAgentToken: string;
  guestAgentToken: string;
  hostAvatarUid: number;
  guestAvatarUid: number;
}

// --- Audience Chat ---
export interface AudienceMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  timestamp: number;
  isQuestion: boolean;
}

// --- Timer ---
export type TimerPhase = "intro" | "main" | "wrapup" | "ended";

export interface TimerState {
  duration: number;
  elapsed: number;
  remaining: number;
  phase: TimerPhase;
}

// --- Transcript ---
export interface PodcastTranscriptEntry {
  uid: string;
  role: "host" | "guest";
  speakerName: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
  turnId?: number;
}

// --- Agent State (per-agent) ---
export interface PodcastAgentState {
  agentId: string;
  rtcUid: number;
  avatarUid: number;
  state: EAgentState;
}

// --- Store Config ---
export interface PodcastConfig {
  topic: string;
  duration: number;
  hostAvatar: PodcastAvatarConfig;
  guestAvatar: PodcastAvatarConfig;
  theme: PodcastTheme;
  lighting: LightingPreset;
  avatarEnabled: boolean;
}

// --- API Request/Response types ---
export interface PodcastStartRequest {
  topic: string;
  duration: number;
  hostAvatarId: string;
  guestAvatarId: string;
  themeId: string;
}

export interface PodcastStartResponse {
  sessionId: string;
  channel: string;
  rtcToken: string;
  rtmToken: string;
  uid: number;
  hostRtcUid: number;
  guestRtcUid: number;
  hostAgentToken: string;
  guestAgentToken: string;
  hostAvatarUid: number;
  guestAvatarUid: number;
}

export interface PodcastStopRequest {
  sessionId: string;
  hostAgentId?: string;
  guestAgentId?: string;
}

export interface PodcastWrapUpRequest {
  sessionId: string;
  hostAgentId: string;
  channelName: string;
  currentSystemMessages: Array<{ role: string; content: string }>;
}

export interface PodcastExtendRequest {
  sessionId: string;
  addSeconds: number;
}
