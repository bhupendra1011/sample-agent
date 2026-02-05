# Plan: Migrate Vite → Next.js + Add Agora Conversational AI

## Goal
Migrate the existing Vite+React app to Next.js (App Router) and add:
1. An "Invite Agent" button (host-only) to the video call controls that starts/stops an Agora Conversational AI agent
2. A settings panel where the host can configure LLM, TTS, and STT providers/models before inviting the agent
3. Server-side API routes to proxy the Agora Conversational AI API

---

## Phase 1: Next.js Migration

### 1.1 Scaffold Next.js project
- Initialize Next.js 15 with App Router, TypeScript, TailwindCSS 4
- Carry over dependencies from current `package.json` (agora-rtc-sdk-ng, agora-rtm-sdk, @netless/fastboard-react, zustand, react-icons, @tanstack/react-query)
- Add new dependency: `agora-token` (server-side token generation for agent)
- Remove: vite, @vitejs/plugin-react, react-router-dom

### 1.2 Convert environment variables
- Client-side: `VITE_*` → `NEXT_PUBLIC_*` (APP_ID, MANAGED_SERVICE_URL, PROJECT_ID, etc.)
- Server-only (new): `AGORA_APP_CERTIFICATE`, `AGORA_CUSTOMER_ID`, `AGORA_CUSTOMER_SECRET`
- Note: LLM/TTS/STT config is user-selectable from the settings panel (sent per-request), not hardcoded in env vars

### 1.3 File structure conversion
```
app/
├── layout.tsx              # Root layout (theme, providers, ToastContainer)
├── page.tsx                # "/" → CreateMeetingScreen (client component)
├── join/
│   └── page.tsx            # "/join" → JoinMeetingScreen (client component)
├── call/
│   └── [channelId]/
│       └── page.tsx        # "/call/:channelId" → VideoCallScreen (client component)
├── api/
│   ├── agent/
│   │   ├── invite/route.ts # POST - start conversational AI agent
│   │   └── stop/route.ts   # POST - stop conversational AI agent
│   └── (future endpoints)
├── globals.css             # Current index.css content
src/
├── api/agoraApi.ts         # Unchanged (managed service calls)
├── components/             # All unchanged, add "use client" where needed
├── hooks/useAgora.ts       # Unchanged, already client-side only
├── services/uiService.ts   # Unchanged
├── store/useAppStore.tsx   # Add agent state fields
├── types/agora.ts          # Add agent-related types
```

### 1.4 Key migration details
- All screen components become `"use client"` page wrappers
- Components using Agora SDKs, browser APIs, or Zustand get `"use client"`
- Replace `react-router-dom` navigation with Next.js `useRouter`/`Link`
- Replace `useNavigate()` with `useRouter().push()`
- Replace `useParams()` from react-router with Next.js page params
- Replace `import.meta.env.VITE_*` with `process.env.NEXT_PUBLIC_*`
- Move theme class logic to `layout.tsx`
- `next.config.ts`: Add any needed Agora domain allowlisting

---

## Phase 2: Add Conversational AI Feature

### 2.1 Server-side API routes

**`app/api/agent/invite/route.ts`**
```
POST /api/agent/invite
Body: { channelName, uid, llmConfig, ttsConfig, sttConfig }
  - llmConfig: { url, apiKey, model, systemMessage, greetingMessage }
  - ttsConfig: { vendor, apiKey, params (voice, region, etc.) }
  - sttConfig: { vendor, language, params }
Server logic:
  1. Generate RTC token for agent using agora-token (RtcTokenBuilder)
  2. POST to https://api.agora.io/api/conversational-ai-agent/v2/projects/{appId}/join
     - Auth: Basic Auth (Base64 of CUSTOMER_ID:CUSTOMER_SECRET)
     - Payload: { name, properties: { channel_name, rtc_token, agent_rtc_uid,
         llm: { url, api_key, model, system_messages, greeting_message },
         tts: { vendor, params },
         asr: { language, params } } }
  3. Return { agentId, status } to client
```

**`app/api/agent/stop/route.ts`**
```
POST /api/agent/stop
Body: { agentId: string }
Server logic:
  1. POST to https://api.agora.io/api/conversational-ai-agent/v2/projects/{appId}/leave
     - Auth: Basic Auth
     - Payload: { agent_id }
  2. Return { success: true }
```

### 2.2 Zustand store additions (`useAppStore.tsx`)
- `agentId: string | null`
- `isAgentActive: boolean`
- `isAgentLoading: boolean`
- `agentSettings: AgentSettings` (LLM/TTS/STT config chosen by user)
- `setAgentActive(agentId: string): void`
- `setAgentLoading(loading: boolean): void`
- `clearAgent(): void`
- `setAgentSettings(settings: AgentSettings): void`
- Reset agent state in `callEnd()`

### 2.3 Client-side agent functions (new file: `src/api/agentApi.ts`)
- `inviteAgent(channelName, uid, agentSettings)` → POST `/api/agent/invite`
- `stopAgent(agentId)` → POST `/api/agent/stop`

### 2.4 UI: Agent Settings Panel (`src/components/AgentSettingsPanel.tsx`)
- Opens as a Modal (reuse existing Modal component) when host clicks a settings icon next to the Invite Agent button
- Sections:
  - **LLM**: dropdown for provider (OpenAI, Gemini, etc.), text input for API key, model selector, system prompt textarea, greeting message input
  - **TTS**: dropdown for vendor (Microsoft, ElevenLabs, etc.), API key, voice name, region
  - **STT**: dropdown for vendor, language selector
- Settings stored in Zustand and sent with the invite request
- Sensible defaults pre-filled

### 2.5 UI: Add button to Controls.tsx
- New button between Whiteboard and Share Meeting buttons (host-only, hidden for non-hosts)
- Icon: `MdSmartToy` from react-icons/md
- States: idle (grey), loading (spinner), active (green/pulsing)
- Click handler: if not active → open settings panel (if not configured) or call inviteAgent; if active → call stopAgent
- Small gear icon next to it to open settings panel
- Uses existing button styling pattern from Controls.tsx

---

## Phase 3: Cleanup & Wire Up

### 3.1 Wire callEnd to stop agent
- In `leaveCall()` or `callEnd()`, if agent is active, call stopAgent first

### 3.2 Update .env.example
- Add all new server-side env vars with descriptions

---

## Files to Create/Modify

| File | Action | Notes |
|------|--------|-------|
| `package.json` | Modify | Swap vite→next, add agora-token, remove react-router-dom |
| `next.config.ts` | Create | Next.js config |
| `tsconfig.json` | Modify | Next.js TS config |
| `app/layout.tsx` | Create | Root layout with providers, theme, ToastContainer |
| `app/page.tsx` | Create | Wraps CreateMeetingScreen |
| `app/join/page.tsx` | Create | Wraps JoinMeetingScreen |
| `app/call/[channelId]/page.tsx` | Create | Wraps VideoCallScreen |
| `app/globals.css` | Create | Move from src/index.css |
| `app/api/agent/invite/route.ts` | Create | Start agent endpoint |
| `app/api/agent/stop/route.ts` | Create | Stop agent endpoint |
| `src/api/agentApi.ts` | Create | Client-side agent API calls |
| `src/api/agoraApi.ts` | Modify | Change env var prefix |
| `src/hooks/useAgora.ts` | Modify | Change env var prefix, add "use client" |
| `src/store/useAppStore.tsx` | Modify | Add agent state |
| `src/types/agora.ts` | Modify | Add agent types |
| `src/components/AgentSettingsPanel.tsx` | Create | LLM/TTS/STT config modal for host |
| `src/components/Controls.tsx` | Modify | Add Invite Agent button (host-only) + settings gear |
| `src/screens/*.tsx` | Modify | Replace react-router hooks with next/navigation |
| `src/App.tsx` | Remove | Routing moves to app/ directory |
| `src/main.tsx` | Remove | Entry point moves to layout.tsx |
| `index.html` | Remove | Next.js handles this |
| `vite.config.ts` | Remove | Replaced by next.config.ts |
| `.env` / `.env.example` | Modify | New env vars |

---

## New Environment Variables Needed

```env
# Server-only (for Conversational AI API auth)
AGORA_APP_CERTIFICATE=xxx
AGORA_CUSTOMER_ID=xxx        # RESTful API customer ID
AGORA_CUSTOMER_SECRET=xxx    # RESTful API customer secret

# LLM/TTS/STT keys are NOT in env vars — they are user-configured
# via the Agent Settings Panel and sent per-request from the client
```

---

## Verification Plan
1. `npm run dev` — app starts on localhost:3000
2. Create a meeting → joins call → video/audio works as before
3. Join meeting from another tab → participants sync via RTM
4. Click "Invite Agent" → agent joins call, speaks greeting
5. Click "Stop Agent" → agent leaves
6. End call → agent is auto-stopped if active
7. `npm run build` — no TypeScript errors
