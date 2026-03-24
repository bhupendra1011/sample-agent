<p align="center">
  <img src="public/favicon.svg" alt="Convo AI Podcast App" width="80" />
</p>

<h1 align="center">🎙️ Convo AI Podcast App</h1>

<p align="center">
  <b>A real-time podcast studio built with Next.js, TypeScript & Agora SDKs</b><br/>
  Live podcast rooms · Host/Audience chat · AI co-host · Transcripts
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Agora-RTC%204.23%20%7C%20RTM%202.2%20%7C%20ConvoAI%202.4-099DFD?logo=agora" alt="Agora" />
</p>

---


## 📖 Overview

Convo AI Podcast App is a real-time podcast experience built on Agora RTC/RTM and the Conversational AI Engine.
It supports podcast room setup, live stage controls, audience interaction, transcript streaming, and an AI co-host with configurable LLM/TTS/ASR providers.

All secret keys stay on the server. Next.js API routes generate Agora tokens, inject API keys, and proxy requests to the [Agora Conversational AI v2 API](https://docs.agora.io/en/conversational-ai/overview/product-overview).

---

Demo: [vimeo:https://vimeo.com/1176174762](https://vimeo.com/1176174762)

## ✨ Features

| Feature                       | Description                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| 🎙️ **Podcast Studio Flow**    | Create and run podcast sessions with dedicated setup and studio UIs  |
| 🧑‍💼 **Host Controls**         | Start, extend, wrap-up, and stop podcast sessions in real time       |
| 👥 **Audience Interaction**   | Live audience chat and RTM messaging during sessions                 |
| 🤖 **AI Co-host Agent**       | Invite and control AI agent with LLM, TTS, and ASR support          |
| 📝 **Live Transcripts**       | Real-time transcript panel for podcast conversations                  |
| 🖼️ **AI Avatars**             | Optional avatar integration (HeyGen, Akool, Anam)                   |
| 🌙 **Dark Mode + Theming**    | Tailwind-based UI with dark mode and podcast theme configuration     |

---

## 🛠️ Tech Stack

| Layer            | Technologies                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Framework**    | Next.js 15 · React 19 · TypeScript 5.8                                                                                 |
| **Styling**      | TailwindCSS 4 · Dark mode                                                                                              |
| **State**        | Zustand 5                                                                                                               |
| **Agora SDKs**   | `agora-rtc-sdk-ng` · `agora-rtm-sdk` v2                                                                                |
| **AI Pipeline**  | Conversational AI Engine · LLM (OpenAI/Anthropic/Gemini) · TTS (ElevenLabs/Microsoft/OpenAI) · ASR (Deepgram/Microsoft/Agora) |
| **Server APIs**  | Next.js Route Handlers (`app/api/*`) for tokens, agent lifecycle, podcast lifecycle, and uploads                      |

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

    Note over U,LLM: 🔵 Podcast Session Flow (no managed service)

    U->>C: Create session, "Start Podcast"
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

> 💡 **How it works:** Tokens are generated server-side by Next.js API routes using the `agora-token` library (no Agora Managed Service). The client fetches `/api/generate-agora-token` for RTC/RTM tokens and channel info, then joins the Agora channel. For the AI agent, API routes generate agent tokens and inject API keys, then call Agora's Conversational AI Engine.

---

## 📋 Prerequisites

Before getting started, make sure you have:

- ✅ **Node.js** v18 or higher
- ✅ **npm** or **yarn**

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

- **Agora (required):** `NEXT_PUBLIC_AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `AGORA_CUSTOMER_ID`, `AGORA_CUSTOMER_SECRET` — then you can create/join podcast sessions and stream audio/video.
- **AI agent (optional):** Set `LLM_API_KEY` and one TTS key (e.g. `ELEVENLABS_API_KEY`) to invite the AI co-host. Other LLM/TTS/ASR/avatar vars in `.env.example` are optional defaults.

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
├── app/                      # Next.js App Router pages and API routes
│   ├── podcast/              # Podcast pages (landing, create, studio)
│   └── api/                  # API routes (agent, podcast, uploads, MCP)
├── src/
│   ├── components/           # Shared + podcast UI components
│   ├── screens/              # Screen-level flows (podcast + call)
│   ├── hooks/                # Agora, agent, and podcast hooks
│   ├── store/                # Zustand stores
│   ├── config/               # Podcast avatars, themes, prompts
│   ├── services/             # UI and app services
│   ├── types/                # TypeScript domain types
│   └── conversational-ai-api/# Conversational AI API client utilities
├── public/                   # Static assets
├── .env.example              # Environment variable template
└── package.json
```

---

## 📄 License

MIT
