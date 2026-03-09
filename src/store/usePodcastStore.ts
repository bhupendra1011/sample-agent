// src/store/usePodcastStore.ts

import { create } from "zustand";
import { EAgentState } from "@/types/agora";
import type {
  PodcastStatus,
  PodcastConfig,
  PodcastSession,
  TimerState,
  PodcastAgentState,
  PodcastTranscriptEntry,
  AudienceMessage,
} from "@/types/podcast";

interface PodcastState {
  // Core status
  status: PodcastStatus;
  config: PodcastConfig | null;
  session: PodcastSession | null;

  // Timer
  timer: TimerState;

  // Agent states
  hostAgent: PodcastAgentState | null;
  guestAgent: PodcastAgentState | null;

  // Transcripts and chat
  transcripts: PodcastTranscriptEntry[];
  audienceMessages: AudienceMessage[];

  // Production controls
  ambienceVolume: number;
  isMuted: boolean;
  wrapUpTriggered: boolean;

  // Actions
  setStatus: (status: PodcastStatus) => void;
  setConfig: (config: PodcastConfig) => void;
  setSession: (session: PodcastSession) => void;
  setHostAgent: (agent: PodcastAgentState) => void;
  setGuestAgent: (agent: PodcastAgentState) => void;
  setHostAgentState: (state: EAgentState) => void;
  setGuestAgentState: (state: EAgentState) => void;
  updateSessionAgentIds: (hostAgentId: string | null, guestAgentId: string | null) => void;
  addTranscript: (entry: PodcastTranscriptEntry) => void;
  updateTranscript: (turnId: number, uid: string, text: string, isFinal: boolean) => void;
  addAudienceMessage: (message: AudienceMessage) => void;
  setTimer: (timer: Partial<TimerState>) => void;
  tickTimer: () => void;
  setAmbienceVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  triggerWrapUp: () => void;
  reset: () => void;
}

const INITIAL_TIMER: TimerState = {
  duration: 0,
  elapsed: 0,
  remaining: 0,
  phase: "intro",
};

const usePodcastStore = create<PodcastState>((set, _get) => ({
  status: "idle",
  config: null,
  session: null,
  timer: INITIAL_TIMER,
  hostAgent: null,
  guestAgent: null,
  transcripts: [],
  audienceMessages: [],
  ambienceVolume: 0.3,
  isMuted: false,
  wrapUpTriggered: false,

  setStatus: (status) => set({ status }),
  setConfig: (config) => set({ config }),
  setSession: (session) => set({ session }),

  setHostAgent: (agent) => set({ hostAgent: agent }),
  setGuestAgent: (agent) => set({ guestAgent: agent }),

  setHostAgentState: (state) =>
    set((s) => ({
      hostAgent: s.hostAgent ? { ...s.hostAgent, state } : null,
    })),
  setGuestAgentState: (state) =>
    set((s) => ({
      guestAgent: s.guestAgent ? { ...s.guestAgent, state } : null,
    })),

  updateSessionAgentIds: (hostAgentId, guestAgentId) =>
    set((s) => ({
      session: s.session
        ? { ...s.session, hostAgentId, guestAgentId }
        : null,
    })),

  addTranscript: (entry) =>
    set((s) => ({ transcripts: [...s.transcripts, entry] })),

  updateTranscript: (turnId, uid, text, isFinal) =>
    set((s) => {
      const idx = s.transcripts.findIndex(
        (t) => t.turnId === turnId && t.uid === uid && !t.isFinal,
      );
      if (idx >= 0) {
        const updated = [...s.transcripts];
        updated[idx] = { ...updated[idx], text, isFinal };
        return { transcripts: updated };
      }
      return {};
    }),

  addAudienceMessage: (message) =>
    set((s) => ({ audienceMessages: [...s.audienceMessages, message] })),

  setTimer: (timer) =>
    set((s) => ({ timer: { ...s.timer, ...timer } })),

  tickTimer: () =>
    set((s) => {
      const elapsed = s.timer.elapsed + 1;
      const remaining = Math.max(0, s.timer.duration - elapsed);
      let phase = s.timer.phase;
      if (elapsed <= 30) phase = "intro";
      else if (remaining <= 0) phase = "ended";
      else if (s.wrapUpTriggered || remaining <= s.timer.duration * 0.2) phase = "wrapup";
      else phase = "main";
      return { timer: { ...s.timer, elapsed, remaining, phase } };
    }),

  setAmbienceVolume: (volume) => set({ ambienceVolume: volume }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  triggerWrapUp: () => set({ wrapUpTriggered: true }),

  reset: () =>
    set({
      status: "idle",
      config: null,
      session: null,
      timer: INITIAL_TIMER,
      hostAgent: null,
      guestAgent: null,
      transcripts: [],
      audienceMessages: [],
      ambienceVolume: 0.3,
      isMuted: false,
      wrapUpTriggered: false,
    }),
}));

export default usePodcastStore;
