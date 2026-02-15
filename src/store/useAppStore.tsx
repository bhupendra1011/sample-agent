// src/store/useAppStore.ts
import { create } from "zustand";
import type {
  Participant,
  PendingUnmuteRequest,
  AgentSettings,
  ITranscriptHelperItem,
} from "@/types/agora";
import { EAgentState, ETranscriptRenderMode } from "@/types/agora";
import type { ILocalAudioTrack, ILocalVideoTrack, IRemoteVideoTrack } from "agora-rtc-sdk-ng";

// Define Theme type
type Theme = "light" | "dark";

// Dummy auth user (replace with real SSO later)
export interface AuthUser {
  displayName: string;
  email: string;
}

// Define Toast types
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface AppState {
  // Existing state...
  videoMuted: boolean;
  audioMuted: boolean;
  callActive: boolean;
  userCount: number;
  localUsername: string;
  localUID: string | null;
  meetingName: string;
  channelId: string;
  hostPassphrase: string;
  viewerPassphrase: string;
  /** When the call started (for 15-min session timer). Set in callStart, cleared in callEnd. */
  sessionStartTime: number | null;
  isScreenSharing: boolean;
  remoteParticipants: {
    [uid: string]: Participant;
  };

  // Host control state
  isHost: boolean;
  pendingUnmuteRequest: PendingUnmuteRequest | null;

  // --- NEW Theme State ---
  theme: Theme;
  toggleTheme: () => void; // Action to toggle theme
  setTheme: (theme: Theme) => void; // Action to set theme directly
  // --- END NEW Theme State ---

  // --- NEW: Local Tracks in Zustand ---
  localAudioTrack: ILocalAudioTrack | null;
  localVideoTrack: ILocalVideoTrack | null;
  setLocalTracks: (
    audioTrack: ILocalAudioTrack | null,
    videoTrack: ILocalVideoTrack | null
  ) => void;
  // --- END NEW ---

  // --- Whiteboard State ---
  whiteboardRoomToken: string;
  whiteboardRoomUuid: string;
  whiteboardAppIdentifier: string;
  whiteboardRegion: string;
  isWhiteboardActive: boolean;
  toggleWhiteboard: () => void;
  setWhiteboardCredentials: (
    token: string,
    uuid: string,
    appIdentifier: string,
    region: string
  ) => void;
  // --- END Whiteboard State ---

  // Agent state
  agentId: string | null;
  isAgentActive: boolean;
  isAgentLoading: boolean;
  isAgentUpdating: boolean;
  agentSettings: AgentSettings | null;
  agentState: EAgentState;
  agentRtcUid: string | null;
  /** When avatar is enabled, the avatar joins with this RTC UID (e.g. 999999). Used to show avatar video in the agent tile. */
  agentAvatarRtcUid: string | null;
  transcriptItems: ITranscriptHelperItem[];
  currentInProgressMessage: ITranscriptHelperItem | null;
  /** User-sent messages for chat preview (text and/or image per send) */
  userSentMessages: { text?: string; imageUrl?: string; _time: number }[];
  addUserSentMessage: (payload: { text?: string; imageUrl?: string }) => void;
  transcriptionMode: "rtc" | "rtm";
  transcriptRenderMode: ETranscriptRenderMode;
  setAgentActive: (agentId: string, agentRtcUid?: string, avatarRtcUid?: string) => void;
  setAgentLoading: (loading: boolean) => void;
  setAgentUpdating: (updating: boolean) => void;
  clearAgent: () => void;
  setAgentSettings: (settings: AgentSettings) => void;
  setAgentState: (state: EAgentState) => void;
  setTranscriptItems: (items: ITranscriptHelperItem[]) => void;
  setCurrentInProgressMessage: (message: ITranscriptHelperItem | null) => void;
  setTranscriptionMode: (mode: "rtc" | "rtm") => void;
  setTranscriptRenderMode: (mode: ETranscriptRenderMode) => void;

  // Host control actions
  setIsHost: (isHost: boolean) => void;
  setPendingUnmuteRequest: (request: PendingUnmuteRequest | null) => void;
  clearPendingUnmuteRequest: () => void;

  // Existing actions...
  toggleVideoMute: () => void;
  toggleAudioMute: () => void;
  /** Screen share credentials from join API; used to start screen share. */
  screenShareRtcToken: string;
  screenShareUid: string | null;
  /** UID of the user currently sharing screen (local or remote); drives layout. */
  activeScreenShareUid: string | null;
  setActiveScreenShareUid: (uid: string | null) => void;
  /** Local screen video track when current user is sharing; stored globally so all components see it. */
  localScreenVideoTrack: ILocalVideoTrack | null;
  setLocalScreenVideoTrack: (track: ILocalVideoTrack | null) => void;
  /** Remote screen video track when another user is sharing; stored globally for reliable access. */
  remoteScreenVideoTrack: IRemoteVideoTrack | null;
  setRemoteScreenVideoTrack: (track: IRemoteVideoTrack | null) => void;
  /** Name of the user sharing screen (for display). */
  screenSharerName: string | null;
  setScreenSharerName: (name: string | null) => void;
  callStart: (payload: {
    userName: string;
    uid: string;
    meetingName: string;
    channelId: string;
    hostPassphrase?: string;
    viewerPassphrase?: string;
    isHost?: boolean;
    screenShareRtcToken?: string;
    screenShareUid?: string;
  }) => void;
  callEnd: () => void;
  /** Clear only session timer (e.g. when extending session). Keeps call state. */
  clearSessionStartTime: () => void;
  increaseUserCount: () => void;
  decreaseUserCount: () => void;
  updateRemoteParticipant: (payload: {
    uid: string;
    name?: string;
    micMuted?: boolean;
    videoMuted?: boolean;
  }) => void;
  removeRemoteParticipant: (payload: { uid: string }) => void;
  setScreenShareStatus: (status: boolean) => void;

  // --- Toast State ---
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
  // --- END Toast State ---

  // --- Voice Settings State ---
  selectedMicrophoneId: string | null;
  setSelectedMicrophoneId: (id: string | null) => void;
  // --- END Voice Settings ---

  // --- Auth (dummy until SSO) ---
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  // --- END Auth ---
}

/**
 * Detects the user's system theme preference using the `prefers-color-scheme` media query.
 * @returns {'dark' | 'light'} The detected system theme, defaults to 'light' if detection is not possible.
 */
const getSystemTheme = (): Theme => {
  // Ensure window and matchMedia are available (e.g., for SSR environments)
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  // Default to 'light' if matchMedia is not supported or not in a browser environment
  return "light";
};

const useAppStore = create<AppState>((set, get) => ({
  // Existing initial state...
  videoMuted: false,
  audioMuted: false,
  callActive: false,
  userCount: 0,
  localUsername: "",
  localUID: null,
  meetingName: "",
  channelId: "",
  hostPassphrase: "",
  viewerPassphrase: "",
  sessionStartTime: null,
  isScreenSharing: false,
  remoteParticipants: {},

  // Agent initial state
  agentId: null,
  isAgentActive: false,
  isAgentLoading: false,
  isAgentUpdating: false,
  agentSettings: null,
  agentState: EAgentState.IDLE,
  agentRtcUid: null,
  agentAvatarRtcUid: null,
  transcriptItems: [],
  currentInProgressMessage: null,
  userSentMessages: [],
  addUserSentMessage: (payload) =>
    set((state) => ({
      userSentMessages: [
        ...state.userSentMessages,
        { ...payload, _time: Date.now() },
      ],
    })),
  transcriptionMode: "rtm",
  transcriptRenderMode: ETranscriptRenderMode.AUTO,
  setAgentActive: (agentId, agentRtcUid, avatarRtcUid) =>
    set({
      agentId,
      agentRtcUid: agentRtcUid || null,
      agentAvatarRtcUid: avatarRtcUid ?? null,
      isAgentActive: true,
      isAgentLoading: false,
    }),
  setAgentLoading: (loading) => set({ isAgentLoading: loading }),
  setAgentUpdating: (updating) => set({ isAgentUpdating: updating }),
  clearAgent: () =>
    set({
      agentId: null,
      isAgentActive: false,
      isAgentLoading: false,
      isAgentUpdating: false,
      agentState: EAgentState.IDLE,
      agentRtcUid: null,
      agentAvatarRtcUid: null,
      transcriptItems: [],
      currentInProgressMessage: null,
      userSentMessages: [],
      transcriptionMode: "rtm",
    }),
  setAgentSettings: (settings) => {
    // Derive transcription mode and update both atomically (default RTM unless explicitly disabled)
    const mode = settings?.advanced_features?.enable_rtm === false ? "rtc" : "rtm";
    set({ agentSettings: settings, transcriptionMode: mode });
  },
  setAgentState: (state) => set({ agentState: state }),
  setTranscriptItems: (items) => set({ transcriptItems: items }),
  setCurrentInProgressMessage: (message) =>
    set({ currentInProgressMessage: message }),
  setTranscriptionMode: (mode) => set({ transcriptionMode: mode }),
  setTranscriptRenderMode: (mode) => set({ transcriptRenderMode: mode }),

  // Host control initial state
  isHost: false,
  pendingUnmuteRequest: null,

  // Host control actions
  setIsHost: (isHost) => set({ isHost }),
  setPendingUnmuteRequest: (request) => set({ pendingUnmuteRequest: request }),
  clearPendingUnmuteRequest: () => set({ pendingUnmuteRequest: null }),

  // --- NEW Theme Initial State & Actions ---
  theme: "dark",
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "light" ? "dark" : "light",
    })),
  setTheme: (theme) => set({ theme }),
  // --- END NEW Theme ---

  // --- NEW: Local Tracks Initial State & Action ---
  localAudioTrack: null,
  localVideoTrack: null,
  setLocalTracks: (audioTrack, videoTrack) =>
    set({ localAudioTrack: audioTrack, localVideoTrack: videoTrack }),
  // --- END NEW ---

  // --- Whiteboard Initial State & Actions ---
  whiteboardRoomToken: "",
  whiteboardRoomUuid: "",
  whiteboardAppIdentifier: "",
  whiteboardRegion: "",
  isWhiteboardActive: false,
  toggleWhiteboard: () =>
    set((state) => ({ isWhiteboardActive: !state.isWhiteboardActive })),
  setWhiteboardCredentials: (token, uuid, appIdentifier, region) =>
    set({
      whiteboardRoomToken: token,
      whiteboardRoomUuid: uuid,
      whiteboardAppIdentifier: appIdentifier,
      whiteboardRegion: region,
    }),
  // --- END Whiteboard ---

  // Screen share state (credentials from API; active sharer for layout)
  screenShareRtcToken: "",
  screenShareUid: null as string | null,
  activeScreenShareUid: null as string | null,
  setActiveScreenShareUid: (uid) => set({ activeScreenShareUid: uid }),
  localScreenVideoTrack: null as ILocalVideoTrack | null,
  setLocalScreenVideoTrack: (track) => set({ localScreenVideoTrack: track }),
  remoteScreenVideoTrack: null as IRemoteVideoTrack | null,
  setRemoteScreenVideoTrack: (track) => set({ remoteScreenVideoTrack: track }),
  screenSharerName: null as string | null,
  setScreenSharerName: (name) => set({ screenSharerName: name }),

  // Existing actions...
  toggleVideoMute: () => set((state) => ({ videoMuted: !state.videoMuted })),
  toggleAudioMute: () => set((state) => ({ audioMuted: !state.audioMuted })),
  callStart: (payload) =>
    set({
      callActive: true,
      localUsername: payload.userName,
      localUID: payload.uid,
      meetingName: payload.meetingName,
      channelId: payload.channelId,
      hostPassphrase: payload.hostPassphrase || "",
      viewerPassphrase: payload.viewerPassphrase || "",
      isHost: payload.isHost || false,
      userCount: 1, // Start with 1 for local user
      sessionStartTime: Date.now(),
      screenShareRtcToken: payload.screenShareRtcToken || "",
      screenShareUid: payload.screenShareUid ?? null,
      activeScreenShareUid: null,
    }),
  callEnd: () =>
    set({
      callActive: false,
      userCount: 0,
      localUsername: "",
      localUID: null,
      meetingName: "",
      channelId: "",
      hostPassphrase: "",
      viewerPassphrase: "",
      sessionStartTime: null,
      isScreenSharing: false,
      remoteParticipants: {},
      whiteboardRoomToken: "",
      whiteboardRoomUuid: "",
      whiteboardAppIdentifier: "",
      whiteboardRegion: "",
      isWhiteboardActive: false,
      screenShareRtcToken: "",
      screenShareUid: null,
      activeScreenShareUid: null,
      localScreenVideoTrack: null,
      remoteScreenVideoTrack: null,
      screenSharerName: null,
      isHost: false,
      pendingUnmuteRequest: null,
      agentId: null,
      isAgentActive: false,
      isAgentLoading: false,
      isAgentUpdating: false,
      agentState: EAgentState.IDLE,
      agentRtcUid: null,
      agentAvatarRtcUid: null,
      transcriptItems: [],
      userSentMessages: [],
      transcriptionMode: "rtm",
    }),
  clearSessionStartTime: () => set({ sessionStartTime: null }),
  increaseUserCount: () => set((state) => ({ userCount: state.userCount + 1 })),
  decreaseUserCount: () => set((state) => ({ userCount: state.userCount - 1 })),
  updateRemoteParticipant: (payload) =>
    set((state) => {
      const { uid, name, micMuted, videoMuted } = payload;
      const existingParticipant = state.remoteParticipants[uid] || {};

      // Helper to check if a name is a generic fallback like "User 12345"
      const isGenericName = (n: string | undefined): boolean =>
        !n || /^User \d+$/.test(n);

      // Determine the final name:
      // - If a real name is provided, use it
      // - If existing has a real name and new is generic/undefined, keep existing
      // - Otherwise use fallback
      let finalName: string;
      if (name !== undefined && !isGenericName(name)) {
        // New name is a real name, use it
        finalName = name;
      } else if (!isGenericName(existingParticipant.name)) {
        // Existing has a real name, preserve it
        finalName = existingParticipant.name!;
      } else {
        // Fall back to provided name or generic
        finalName = name ?? existingParticipant.name ?? `User ${uid}`;
      }

      return {
        remoteParticipants: {
          ...state.remoteParticipants,
          [uid]: {
            name: finalName,
            micMuted:
              micMuted !== undefined
                ? micMuted
                : existingParticipant.micMuted === undefined
                ? true
                : existingParticipant.micMuted,
            videoMuted:
              videoMuted !== undefined
                ? videoMuted
                : existingParticipant.videoMuted === undefined
                ? true
                : existingParticipant.videoMuted,
          },
        },
      };
    }),
  removeRemoteParticipant: (payload) =>
    set((state) => {
      const newRemoteParticipants = { ...state.remoteParticipants };
      delete newRemoteParticipants[payload.uid];
      return { remoteParticipants: newRemoteParticipants };
    }),
  setScreenShareStatus: (status) => set({ isScreenSharing: status }),

  // --- Toast Actions ---
  toasts: [],
  addToast: (message, type) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  // --- END Toast Actions ---

  // --- Voice Settings State & Actions ---
  selectedMicrophoneId: null,
  setSelectedMicrophoneId: (id) => set({ selectedMicrophoneId: id }),
  // --- END Voice Settings ---

  // --- Auth (dummy until SSO) ---
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
  // --- END Auth ---
}));

// Apply default theme to HTML root on load (important for initial render)
// Guard for SSR — document is not available on server.
if (typeof document !== "undefined") {
  const initialTheme = useAppStore.getState().theme;
  document.documentElement.classList.add(initialTheme);
}

export default useAppStore;
