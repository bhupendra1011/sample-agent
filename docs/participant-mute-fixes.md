# Participant Count & Mute State Synchronization

## Overview

This document describes how participant counting and audio/video mute states are synchronized across all users in a meeting using Agora RTC + RTM (Signaling) SDK v2.x.

## Architecture

Two Agora SDKs work together:

- **RTC SDK** (`agora-rtc-sdk-ng`): Handles actual audio/video streams. Controls local tracks via `track.setEnabled()` and `track.stop()`/`track.play()`.
- **RTM SDK** (`agora-rtm-sdk` v2.x): Handles signaling — participant metadata, mute state broadcasts, and host control commands.

## Participant Counting

**Flow:**
1. `callStart()` sets `userCount = 1` (local user)
2. When a remote user publishes **any** media (audio or video), `handleUserPublished` fires
3. A `countedUsersRef` Set tracks which UIDs have been counted to prevent duplicates
4. `increaseUserCount()` fires on the first publish event per user (audio or video, whichever arrives first)
5. `handleUserLeft` decrements the count and removes from `countedUsersRef`

**Why both audio and video trigger counting:**
A user may join with video off (audio-only). Counting only on video publish would miss these users entirely.

## Local Video Mute

**Flow:**
1. User clicks video toggle in `Controls.tsx`
2. `handleToggleVideo()` calls `track.setEnabled(false)` on the Agora video track
3. `toggleVideoMute()` updates Zustand store (`videoMuted = true`)
4. `VideoTile` useEffect detects `videoMuted` change and calls `track.stop()` to halt rendering
5. The `{videoMuted && (...)}` conditional shows the avatar placeholder
6. A `useEffect` in `useAgora.ts` watches `audioMuted`/`videoMuted` and broadcasts the change via:
   - `RTM_CLIENT.presence.setState()` — for late joiners (presence SNAPSHOT)
   - `RTM_CLIENT.publish()` with `media-state-updated` — for immediate sync

## Remote Mute (Host Control)

**Mute flow (host -> remote user):**
1. Host clicks mute icon in `ParticipantListItem` sidebar
2. `sendHostControlRequest(uid, "mute", "audio"|"video")` sends a private RTM message to the target user via User Channel (`RTM_CLIENT.publish(targetUid, ...)`)
3. Target user receives `host-mute-request` in `handleRTMMessageV2`
4. Target user auto-mutes: `track.setEnabled(false)` + `toggleAudioMute()`/`toggleVideoMute()`
5. Target user broadcasts updated state to ALL participants via:
   - `media-state-updated` channel message
   - `presence.setState()` update
6. All participants' UIs update via `updateRemoteParticipant()`

**Unmute flow (host -> remote user):**
1. Host clicks unmute icon -> sends `host-unmute-request` via User Channel
2. Target user sees a consent modal (privacy protection)
3. If accepted: `acceptUnmuteRequest()` enables track + broadcasts state
4. If declined: modal closes, no change

## RTM Message Types

| Message Type | Channel | Direction | Purpose |
|---|---|---|---|
| `user-joined` | Message Channel | Broadcast | Announce new user with name/mute state |
| `user-left` | Message Channel | Broadcast | Announce user departure |
| `media-state-updated` | Message Channel | Broadcast | Sync mute state changes |
| `host-mute-request` | User Channel | Private (host->user) | Force-mute a participant |
| `host-unmute-request` | User Channel | Private (host->user) | Request unmute (requires consent) |
| `whiteboard-started` | Message Channel | Broadcast | Sync whiteboard activation |
| `whiteboard-stopped` | Message Channel | Broadcast | Sync whiteboard deactivation |

## RTM Presence Events

| Event | When | Action |
|---|---|---|
| `SNAPSHOT` | On channel subscribe | Populate all existing users' names + mute states |
| `REMOTE_JOIN` | User joins channel | Logged (name comes via `user-joined` message) |
| `REMOTE_LEAVE` | User leaves channel | Logged (cleanup via RTC `user-left` event) |
| `REMOTE_STATE_CHANGED` | User calls `setState()` | Update participant's name/mute state in store |

## Key Files

- `src/hooks/useAgora.ts` — All RTC/RTM logic, event handlers, host controls
- `src/store/useAppStore.tsx` — Zustand store with `remoteParticipants`, mute states
- `src/components/VideoTile.tsx` — Video rendering, responds to `videoMuted` prop
- `src/components/Controls.tsx` — Local mute toggle buttons
- `src/components/ParticipantListItem.tsx` — Sidebar with host mute controls
- `src/screens/VideoCallScreen.tsx` — Layout orchestration, wires everything together
