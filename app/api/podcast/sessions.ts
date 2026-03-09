// app/api/podcast/sessions.ts
// Module-level in-memory Map for active podcast sessions.
// Shared across podcast API routes in the same process.

export interface ServerPodcastSession {
  sessionId: string;
  channel: string;
  viewerUid: number;
  hostRtcUid: number;
  guestRtcUid: number;
  hostAvatarUid: number;
  guestAvatarUid: number;
  hostAgentId: string | null;
  guestAgentId: string | null;
  topic: string;
  duration: number;
  createdAt: number;
  wrapUpAt: number | null;
}

export const podcastSessions = new Map<string, ServerPodcastSession>();
