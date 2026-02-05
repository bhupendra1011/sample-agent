// src/api/agoraApi.ts
import type { MeetingResponse } from "@/types/agora";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
const API_KEY = process.env.NEXT_PUBLIC_AGORA_API_KEY;
const MANAGED_SERVICE_URL = process.env.NEXT_PUBLIC_AGORA_MANAGED_SERVICE_URL;
const PROJECT_ID = process.env.NEXT_PUBLIC_AGORA_PROJECT_ID;
const WHITEBOARD_APPIDENTIFIER =
  process.env.NEXT_PUBLIC_AGORA_WHITEBOARD_APPIDENTIFIER;
const WHITEBOARD_REGION = process.env.NEXT_PUBLIC_AGORA_WHITEBOARD_REGION;

// Export these configurations for use in other parts of the application (e.g., useAgora hook)
export const AGORA_CONFIG = {
  APP_ID,
  API_KEY,
  MANAGED_SERVICE_URL,
  PROJECT_ID,
  WHITEBOARD_APPIDENTIFIER,
  WHITEBOARD_REGION,
};

/**
 * Generates a unique request ID for API calls
 */
function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calls your backend to join an existing meeting using a provided passphrase.
 * @param {string} userName - The name of the user attempting to join.
 * @param {string} passphrase - The meeting's passphrase (Meeting ID).
 * @returns {Promise<MeetingResponse>} - A promise that resolves with meeting details including tokens.
 */
export async function joinExistingMeetingApi({
  userName,
  passphrase,
}: {
  userName: string;
  passphrase: string;
}): Promise<MeetingResponse> {
  // Step 1: Generate a JWT token for user authentication with your managed service
  const requestId = generateUniqueId();
  const platformId = "turnkey_web";
  const jwtRes = await fetch(
    `${MANAGED_SERVICE_URL}/login?project_id=${AGORA_CONFIG.PROJECT_ID}&platform_id=${platformId}`,
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
    }
  );
  if (!jwtRes.ok) {
    const errorText = await jwtRes.text();
    throw new Error(
      `Login failed: ${jwtRes.status} ${jwtRes.statusText} - ${errorText}`
    );
  }
  const data = await jwtRes.json();
  if (!data.token) {
    throw new Error("Login response missing token");
  }
  const jwtToken = data.token;

  // Step 2: Request to join the channel using the generated JWT and passphrase
  const joinRes = await fetch(`${MANAGED_SERVICE_URL}/channel/join/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ passphrase: passphrase }),
  });
  if (!joinRes.ok) {
    const errorBody = await joinRes.json();
    throw new Error(
      `Failed to join meeting: ${joinRes.statusText} - ${
        errorBody.message || "Unknown error"
      }`
    );
  }
  // Parse the response which contains RTC/RTM tokens, UIDs, channel ID, etc.
  const joinData: MeetingResponse = await joinRes.json();

  return joinData;
}

/**
 * Calls your backend to create a new meeting and immediately join it as a host.
 * @param {string} userName - The name of the user creating and joining.
 * @param {string} channelName - The desired title for the new meeting.
 * @param {string} role - The role of the user (e.g., "host" or "attendee"). Defaults to "host".
 * @returns {Promise<MeetingResponse>} - A promise that resolves with new meeting details and tokens.
 */
export async function createAndJoinMeetingApi({
  userName,
  channelName,
  role = "host",
}: {
  userName: string;
  channelName: string;
  role?: "host" | "attendee";
}): Promise<MeetingResponse> {
  // Step 1: Generate a JWT token for user authentication
  const requestId = generateUniqueId();
  const platformId = "turnkey_web";
  const jwtRes = await fetch(
    `${MANAGED_SERVICE_URL}/login?project_id=${AGORA_CONFIG.PROJECT_ID}&platform_id=${platformId}`,
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
    }
  );
  if (!jwtRes.ok) {
    const errorText = await jwtRes.text();
    throw new Error(
      `Login failed: ${jwtRes.status} ${jwtRes.statusText} - ${errorText}`
    );
  }
  const data = await jwtRes.json();
  if (!data.token) {
    throw new Error("Login response missing token");
  }
  const jwtToken = data.token;

  // Step 2: Create a new channel (meeting)
  const createRes = await fetch(`${MANAGED_SERVICE_URL}/channel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ title: channelName, enable_pstn: false }), // `enable_pstn` can be set to true for PSTN support
  });
  if (!createRes.ok) {
    const errorBody = await createRes.json();
    throw new Error(
      `Failed to create channel: ${createRes.statusText} - ${
        errorBody.message || "Unknown error"
      }`
    );
  }
  const createData = await createRes.json();
  const hostPassphrase = createData.host_pass_phrase; // Passphrase for hosts
  const viewerPassphrase = createData.viewer_pass_phrase; // Passphrase for viewers

  // Step 3: Immediately join the newly created channel using the appropriate passphrase
  const passphrase = role === "host" ? hostPassphrase : viewerPassphrase; // Creator joins as host, uses host passphrase

  const joinRes = await fetch(`${MANAGED_SERVICE_URL}/channel/join/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ passphrase: passphrase }),
  });
  if (!joinRes.ok) {
    const errorBody = await joinRes.json();
    throw new Error(
      `Failed to join created meeting: ${joinRes.statusText} - ${
        errorBody.message || "Unknown error"
      }`
    );
  }
  const joinData: MeetingResponse = await joinRes.json();

  // Return combined data, including generated passphrases and the meeting title
  return {
    ...joinData,
    hostPassphrase,
    viewerPassphrase,
    title: createData.title,
  };
}
