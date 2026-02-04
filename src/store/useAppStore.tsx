// src/store/useAppStore.ts
import { create } from "zustand";
import type { Participant, PendingUnmuteRequest } from "../types/agora";
import AgoraRTC from "agora-rtc-sdk-ng";

// Define Theme type
type Theme = "light" | "dark";

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
  hostPassphrase: string;
  viewerPassphrase: string;
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
  localAudioTrack: AgoraRTC.IAudioTrack | null;
  localVideoTrack: AgoraRTC.IVideoTrack | null;
  setLocalTracks: (
    audioTrack: AgoraRTC.IAudioTrack | null,
    videoTrack: AgoraRTC.IVideoTrack | null
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

  // Host control actions
  setIsHost: (isHost: boolean) => void;
  setPendingUnmuteRequest: (request: PendingUnmuteRequest | null) => void;
  clearPendingUnmuteRequest: () => void;

  // Existing actions...
  toggleVideoMute: () => void;
  toggleAudioMute: () => void;
  callStart: (payload: {
    userName: string;
    uid: string;
    meetingName: string;
    hostPassphrase?: string;
    viewerPassphrase?: string;
    isHost?: boolean;
  }) => void;
  callEnd: () => void;
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
  hostPassphrase: "",
  viewerPassphrase: "",
  isScreenSharing: false,
  remoteParticipants: {},

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

  // Existing actions...
  toggleVideoMute: () => set((state) => ({ videoMuted: !state.videoMuted })),
  toggleAudioMute: () => set((state) => ({ audioMuted: !state.audioMuted })),
  callStart: (payload) =>
    set({
      callActive: true,
      localUsername: payload.userName,
      localUID: payload.uid,
      meetingName: payload.meetingName,
      hostPassphrase: payload.hostPassphrase || "",
      viewerPassphrase: payload.viewerPassphrase || "",
      isHost: payload.isHost || false,
      userCount: 1, // Start with 1 for local user
    }),
  callEnd: () =>
    set({
      callActive: false,
      userCount: 0,
      localUsername: "",
      localUID: null,
      meetingName: "",
      hostPassphrase: "",
      viewerPassphrase: "",
      isScreenSharing: false,
      remoteParticipants: {},
      whiteboardRoomToken: "",
      whiteboardRoomUuid: "",
      whiteboardAppIdentifier: "",
      whiteboardRegion: "",
      isWhiteboardActive: false,
      isHost: false,
      pendingUnmuteRequest: null,
    }),
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
}));

// Apply default theme to HTML root on load (important for initial render)
// This runs once when the store is created.
const initialTheme = useAppStore.getState().theme;
document.documentElement.classList.add(initialTheme);

export default useAppStore;
