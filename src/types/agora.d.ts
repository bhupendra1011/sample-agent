// src/types/agora.d.ts

// Import AgoraRTC for its specific types, like IAudioTrack, IVideoTrack, IAgoraRTCRemoteUser.
// These are essential for type-checking when interacting directly with the Agora Web SDK.
import AgoraRTC from "agora-rtc-sdk-ng";

/**
 * Defines the structure for local audio and video tracks managed by Agora RTC.
 * These tracks represent the media streams captured from the user's microphone and camera.
 */
export interface LocalAgoraTracks {
  audioTrack: AgoraRTC.IAudioTrack | null;
  videoTrack: AgoraRTC.IVideoTrack | null;
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
