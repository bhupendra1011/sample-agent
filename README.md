# My Agora App

A real-time communication application built with React, TypeScript, and Agora SDKs. Features video/voice calling, real-time messaging (RTM), and interactive whiteboard capabilities.

## Features

- 🎥 **Video & Voice Calling** - Powered by Agora RTC SDK
- 💬 **Real-time Messaging** - Using Agora RTM SDK v2
- 🎨 **Interactive Whiteboard** - Integrated with Netless Fastboard
- ⚡ **Modern Stack** - React 19, TypeScript, Vite, TailwindCSS
- 🔄 **State Management** - Zustand & React Query

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS 4
- **State**: Zustand, TanStack React Query
- **Agora SDKs**: agora-rtc-sdk-ng, agora-rtm-sdk v2, @netless/fastboard-react

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- An [Agora Account](https://console.agora.io/)

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd my-agora-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example environment file and fill in your Agora credentials:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your values:

   ```env
   VITE_AGORA_APP_ID="your-app-id"
   VITE_AGORA_API_KEY="your-api-key"
   VITE_AGORA_MANAGED_SERVICE_URL="https://managedservices-preprod.rteappbuilder.com/v1"
   VITE_AGORA_PROJECT_ID="your-project-id"
   VITE_AGORA_WHITEBOARD_APPIDENTIFIER="your-whiteboard-app-identifier"
   VITE_AGORA_WHITEBOARD_REGION="us-sv"
   ```

   **Where to get these values:**

   - `VITE_AGORA_APP_ID`: [Agora Console](https://console.agora.io/) → Project Management → Your Project
   - `VITE_AGORA_API_KEY`: Agora Console → RESTful API
   - `VITE_AGORA_PROJECT_ID`: Agora Console → Project Management
   - `VITE_AGORA_WHITEBOARD_APPIDENTIFIER`: Agora Console → Whiteboard → Configuration
   - `VITE_AGORA_WHITEBOARD_REGION`: Choose based on your users' location (`us-sv`, `sg`, `cn-hz`, `in-mum`, `eu`)

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:5173`

## Available Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start development server |
| `npm run build`   | Build for production     |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run ESLint               |

## Project Structure

```
my-agora-app/
├── src/
│   ├── api/          # API calls and Agora service integrations
│   ├── components/   # React components
│   ├── hooks/        # Custom React hooks
│   ├── stores/       # Zustand stores
│   └── ...
├── .env.example      # Example environment variables
└── package.json
```

## License

MIT
