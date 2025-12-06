// src/store/useAppStore.ts
import { create } from "zustand";
import { Participant } from "../types/agora";
import AgoraRTC from "agora-rtc-sdk-ng";

// Define Theme type
type Theme = "light" | "dark";

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

  // Existing actions...
  toggleVideoMute: () => void;
  toggleAudioMute: () => void;
  callStart: (payload: {
    userName: string;
    uid: string;
    meetingName: string;
    hostPassphrase?: string;
    viewerPassphrase?: string;
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
    }),
  increaseUserCount: () => set((state) => ({ userCount: state.userCount + 1 })),
  decreaseUserCount: () => set((state) => ({ userCount: state.userCount - 1 })),
  updateRemoteParticipant: (payload) =>
    set((state) => {
      const { uid, name, micMuted, videoMuted } = payload;
      const existingParticipant = state.remoteParticipants[uid] || {};
      return {
        remoteParticipants: {
          ...state.remoteParticipants,
          [uid]: {
            name:
              name !== undefined
                ? name
                : existingParticipant.name || `User ${uid}`,
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
}));

// Apply default theme to HTML root on load (important for initial render)
// This runs once when the store is created.
const initialTheme = useAppStore.getState().theme;
document.documentElement.classList.add(initialTheme);

export default useAppStore;
