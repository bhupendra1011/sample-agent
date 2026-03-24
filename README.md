<p align="center">
  <img src="public/favicon.svg" alt="Voice Controlled Smart Light" width="80" />
</p>

<h1 align="center">💡 Voice Controlled Smart Light</h1>

<p align="center">
  <b>A real-time voice-and-vision IoT demo built with Next.js, TypeScript & Agora SDKs</b><br/>
  Voice control · Camera verification · MCP tools · ESP8266 smart light
</p>

> **Branch `feat/main-basic-app-iot`** — Adds an end-to-end **voice + vision + MCP** demo: the Conversational AI agent controls a physical LED/OLED device and can **verify** changes using your camera feed.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Agora-RTC%204.23%20%7C%20RTM%202.2%20%7C%20ConvoAI%202.4-099DFD?logo=agora" alt="Agora" />
</p>

---


## 📖 Overview

This app delivers a **Voice Controlled Smart Light** demo on [Agora Conversational AI](https://docs.agora.io/en/conversational-ai/overview/product-overview): configurable LLM, TTS, and ASR, with **MCP (Model Context Protocol)** tool calling to control real hardware.

**On this branch**, that same stack drives an **IoT smart light** demo: the agent issues MCP tool calls to a small Python MCP server, which talks to a **NodeMCU ESP8266** over HTTP (LED ring + OLED). The differentiator is **closed-loop verification** — the agent subscribes to your **camera** in the same RTC channel and can confirm the LED state visually (multimodal LLM), not only via `get_light_status`.

Secret keys stay on the server. Next.js API routes generate Agora tokens and proxy Conversational AI API calls.

---

## 💡 IoT smart light (this branch)

| What | Where in the repo |
| ---- | ----------------- |
| **ESP8266 firmware (smart light)** | [`arduino_code/smart_light/smart_light.ino`](arduino_code/smart_light/smart_light.ino) |
| **Arduino environment setup** | [`arduino_code/SETUP.md`](arduino_code/SETUP.md) |
| **Editor MCP config (optional)** | [`.mcp.json`](.mcp.json) |

The **web app** already exposes MCP configuration in the Agent Settings sidebar and agent invite flow. The **Python MCP server** runs **alongside** this repo; it is not required for `npm run dev` unless you are doing the full hardware demo.

### IoT architecture (high level)

```mermaid
flowchart TB
  subgraph channel [Agora RTC channel]
    U[Local user]
    A[Convo AI agent]
  end
  U -->|camera + mic| A
  A -->|TTS| U
  A -->|MCP tool_call| MCP[MCP server FastAPI]
  MCP -->|HTTP| ESP[NodeMCU ESP8266]
  ESP --> LED[NeoPixel ring + OLED]
```

**Flows:** voice → RTC → agent ASR/LLM/TTS; light control → MCP → device HTTP; verification → user video → agent multimodal LLM.

---

vimeo:https://vimeo.com/1176182479

## ✨ Features

| Feature                        | Description                                            |
| ------------------------------ | ------------------------------------------------------ |
| 🎥 **Video & Voice Calling**   | HD video/voice calls powered by Agora RTC SDK          |
| 💬 **Real-time Messaging**     | Instant chat using Agora RTM SDK v2                    |
| 🤖 **AI Conversational Agent** | Talk to an AI agent with LLM, TTS & ASR support        |
| 🖼️ **AI Avatars**              | Optional avatar integration (HeyGen, Akool, Anam)      |
| 🌙 **Dark Mode**               | Full dark mode support with Tailwind                   |
| 🔌 **MCP Tools**               | Model Context Protocol servers for AI-powered tooling  |
| 💡 **IoT smart light**         | MCP tools for LED/OLED; vision verification (this branch) |
| ⚡ **Modern Stack**            | Next.js 15, React 19, TypeScript, Zustand, React Query |

---

## 🛠️ Demo Tech Stack

| Layer          | Technologies                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Framework**  | Next.js 15 · React 19 · TypeScript 5.8                                                                                 |
| **Styling**    | TailwindCSS 4 · Dark mode (class strategy)                                                                             |
| **State**      | Zustand 5 · TanStack React Query                                                                                       |
| **Agora SDKs** | `agora-rtc-sdk-ng` · `agora-rtm-sdk` v2                                                                               |
| **AI**         | Conversational AI · LLM (OpenAI/Anthropic/Gemini) · TTS · ASR — **multimodal LLM required for camera verification**    |
| **IoT (branch)** | ESP8266 + Arduino firmware in `arduino_code/` · Python MCP server (run separately)                                     |

---

## 🏗️ Architecture

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant C as 🖥️ Next.js Client
    participant API as ⚙️ Next.js API<br/>Routes
    participant RTC as 📡 Agora RTC
    participant AI as 🧠 Conversational<br/>AI Engine
    participant LLM as 🤖 LLM Provider

    Note over U,LLM: 🔵 Meeting Flow (no managed service)

    U->>C: Enter name, "Start Conversation"
    C->>API: GET /api/generate-agora-token
    API->>API: Build RTC/RTM token (agora-token),<br/>generate channel + UID
    API-->>C: token, uid, channel
    C->>RTC: Join channel with tokens
    RTC-->>C: Connected (audio/video streaming)

    Note over U,LLM: 🟣 AI Agent Flow

    U->>C: Click "Invite AI Agent"
    C->>API: POST /api/agent/invite
    API->>API: Generate agent token,<br/>inject API keys
    API->>AI: POST /v2/projects/{appId}/join
    AI-->>RTC: Agent joins channel

    Note over U,LLM: 🟡 Conversation Flow

    U->>RTC: 🎤 Speaks into microphone
    RTC->>AI: Audio stream
    AI->>AI: Voice Activity Detection<br/>+ ASR (Speech → Text)
    AI->>LLM: Send transcribed text
    LLM-->>AI: AI response
    AI->>AI: TTS (Text → Speech)
    AI->>RTC: Publish agent audio
    RTC-->>C: Stream agent response
    C-->>U: 🔊 Play AI audio +<br/>show transcript

    Note over U,LLM: 🔴 Teardown

    U->>C: Click "Stop Agent"
    C->>API: POST /api/agent/stop
    API->>AI: Stop agent
    AI-->>RTC: Agent leaves channel
```

> **How it works:** Tokens are generated server-side by Next.js API routes using the `agora-token` library (no Agora Managed Service). The client fetches `/api/generate-agora-token` for RTC/RTM tokens and channel info, then joins the Agora channel. For the AI agent, API routes generate agent tokens and inject API keys, then call Agora's Conversational AI Engine.

**IoT extension:** With MCP servers configured in Agent Settings, the agent can call tools during the same session; for the smart light demo those tools hit the FastAPI MCP server, which forwards commands to the ESP8266.

---

## 📋 Prerequisites

Before getting started, make sure you have:

- ✅ **Node.js** v18 or higher
- ✅ **npm** or **yarn**

**For the full IoT demo (optional):** ESP8266 + components, **Python 3** for the MCP server, and a **multimodal LLM** API key for camera-based verification.

### 🔑 Agora Account Setup

Follow these steps **in order** to set up your Agora project:

#### Step 1 — Create a project in Agora Console

1. Go to 👉 [**Agora Console**](https://console.agora.io/)
2. Sign up or log in and create a new project
3. Copy your **App ID** from Project Management

#### Step 2 — Enable RTM & Conversational AI

1. In your project settings in [Agora Console](https://console.agora.io/), enable:
   - ✅ **Real-Time Messaging (RTM)** — for chat
   - ✅ **Conversational AI** — for the AI agent
2. Copy your **App Certificate** from Project Management → Security

#### Step 3 — Get RESTful API credentials

1. Go to [**Agora RESTful API**](https://console.agora.io/restful-api)
2. Copy your **Customer ID** and **Customer Secret** — required for token generation and Conversational AI API calls

---

## 🚀 Getting Started

### 1️⃣ Clone the repository

```bash
git clone <repository-url>
cd my-agora-app
git checkout feat/main-basic-app-iot   # IoT smart light branch
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your keys. **Minimum to run the app:**

- **Agora (required):** `NEXT_PUBLIC_AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `AGORA_CUSTOMER_ID`, `AGORA_CUSTOMER_SECRET` — then you can create/join meetings and use voice/video.
- **AI agent (optional):** Set `LLM_API_KEY` and one TTS key (e.g. `ELEVENLABS_API_KEY`) to invite the conversational AI agent. Other LLM/TTS/ASR/avatar vars in `.env.example` are optional defaults.
- **IoT + vision:** Use a vision-capable model and enable MLLM in agent settings.

| Variable                     | Where to get it                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_AGORA_APP_ID`   | [Agora Console](https://console.agora.io/) → Project Management                |
| `AGORA_APP_CERTIFICATE`      | [Agora Console](https://console.agora.io/) → Project → Security                |
| `AGORA_CUSTOMER_ID` / `SECRET` | [Agora RESTful API](https://console.agora.io/restful-api)                     |

All supported variables (LLM, TTS, ASR, avatars) are listed in `.env.example` with empty values — fill only what you need.

### 4️⃣ Start the development server

```bash
npm run dev
```

### 5️⃣ Open your browser

Navigate to 👉 `http://localhost:3000`

### 6️⃣ IoT demo (optional)

Flash [`arduino_code/smart_light/smart_light.ino`](arduino_code/smart_light/smart_light.ino), run your FastAPI MCP server, then connect that endpoint in Agent Settings (LLM tab → MCP Server Configuration).

---

## 📜 Available Scripts

| Command         | Description                 |
| --------------- | --------------------------- |
| `npm run dev`   | 🔄 Start development server |
| `npm run build` | 📦 Build for production     |
| `npm run start` | 🚀 Start production server  |
| `npm run lint`  | 🔍 Run ESLint               |

---

## 📁 Project Structure

```
my-agora-app/
├── arduino_code/          # ESP8266 sketches (smart_light, hello_blink, SETUP.md)
├── src/
│   ├── app/               # Next.js App Router pages & API routes
│   ├── components/        # React components
│   │   └── common/        # Reusable UI (Button, Card, Modal, InputField)
│   ├── hooks/             # Custom React hooks (useAgora)
│   ├── services/          # Utility services (uiService)
│   ├── store/             # Zustand stores
│   └── types/             # TypeScript definitions
├── public/                # Static assets
├── .env.example           # Environment variable template
└── package.json
```

*(Optional)* **`.mcp.json`** at the repo root can point your editor’s MCP client at an IoT MCP URL for local tooling — separate from in-app Agent Settings MCP config.

---

## 📄 License

MIT
