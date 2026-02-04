# Host Mute Remote User Feature

## Overview

This feature allows meeting hosts to mute/unmute remote participants' audio and video using Agora RTM v2.x signaling.

## Architecture

```
User Channel (private)    → Mute/Unmute REQUEST
Message Channel (broadcast) → Actual STATE updates
Presence API              → State snapshot for late joiners
```

## Privacy Model

| Action | Behavior |
|--------|----------|
| **Mute** | Host sends request → User's device auto-complies |
| **Unmute** | Host sends request → User sees consent modal → User decides |

**Key Principle**: You can force-mute someone, but you cannot force-unmute them (privacy protection).

## Message Flow

### Host Mutes User (Auto-comply)

```
1. Host clicks mute button
       ↓
2. sendHostControlRequest(uid, "mute", "audio")
       ↓
3. RTM User Channel → Private message to target user
       ↓
4. Target receives "host-mute-request"
       ↓
5. Target auto-mutes: track.setEnabled(false)
       ↓
6. Target broadcasts "media-state-updated" via Message Channel
       ↓
7. All users see updated mute state in UI
```

### Host Requests Unmute (User Consent)

```
1. Host clicks unmute button
       ↓
2. sendHostControlRequest(uid, "unmute", "audio")
       ↓
3. RTM User Channel → Private message to target user
       ↓
4. Target receives "host-unmute-request"
       ↓
5. Target sees consent modal
       ↓
6a. User clicks "Accept":
    - track.setEnabled(true)
    - Broadcasts updated state
    - All users see unmuted state

6b. User clicks "Decline":
    - Modal closes
    - No state change
    - Host not notified (privacy)
```

## RTM Message Types

### Host Control Messages (User Channel - Private)

```typescript
interface HostControlMessage {
  type: "host-mute-request" | "host-unmute-request";
  fromUid: string;      // Host's UID
  fromName: string;     // Host's display name
  targetUid: string;    // Target user's UID
  mediaType: "audio" | "video" | "both";
  timestamp: number;
}
```

### Media State Update (Message Channel - Broadcast)

```typescript
{
  type: "media-state-updated",
  uid: string,
  micMuted: boolean,
  videoMuted: boolean
}
```

## Files Modified

| File | Changes |
|------|---------|
| `src/types/agora.ts` | Added `HostControlMessage`, `PendingUnmuteRequest` types |
| `src/store/useAppStore.tsx` | Added `isHost`, `pendingUnmuteRequest` state and actions |
| `src/hooks/useAgora.ts` | Added RTM handlers and `sendHostControlRequest`, `acceptUnmuteRequest`, `declineUnmuteRequest` |
| `src/components/ParticipantListItem.tsx` | Added host mute/unmute control buttons |
| `src/screens/VideoCallScreen.tsx` | Wired up controls and added consent modal |
| `src/screens/CreateMeetingScreen.tsx` | Set `isHost: true` for meeting creator |
| `src/screens/JoinMeetingScreen.tsx` | Pass `isHost` from API response |

## Key Functions

### `sendHostControlRequest(targetUid, action, mediaType)`
Sends a private mute/unmute request to a specific user via RTM User Channel.

### `acceptUnmuteRequest()`
Called when user accepts the unmute request. Enables the track and broadcasts the updated state.

### `declineUnmuteRequest()`
Called when user declines. Simply closes the modal with no state change.

## UI Components

### Host View (ParticipantListItem)
- Shows mute/unmute buttons next to each remote participant
- Orange icon = Click to mute (user is currently unmuted)
- Blue icon = Click to request unmute (user is currently muted)

### User View (Consent Modal)
- Appears when host requests unmute
- Shows who is requesting and what media type
- Accept/Decline buttons
- Can close with Escape key or clicking outside

## Testing

1. **Test mute flow**:
   - Open two browsers, create meeting in one (host), join in other
   - Host clicks mute on participant → Participant's mic turns off immediately
   - Both UIs show muted state

2. **Test unmute request**:
   - Host clicks unmute on muted participant
   - Participant sees consent modal
   - Accept → Mic turns on, both UIs update
   - Decline → Nothing changes

3. **Test privacy**:
   - Only the target user sees the private request
   - Other participants don't see mute requests, only final state changes

4. **Test late joiner**:
   - New user joins after mute actions → Sees correct mute state via Presence API
