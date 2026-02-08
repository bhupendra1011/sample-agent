"use client";

import React from "react";
import { MdMic, MdMicOff } from "react-icons/md";
import { EAgentState } from "@/types/agora";

interface AgentTileProps {
  agentUid: string;
  agentState: EAgentState;
  agentName?: string;
}

const AgentTile: React.FC<AgentTileProps> = ({
  agentUid,
  agentState,
  agentName = "AI Agent",
}) => {
  // Get state-specific styling and animation
  const getStateStyles = () => {
    switch (agentState) {
      case EAgentState.IDLE:
        return "animate-pulse";
      case EAgentState.LISTENING:
        return "animate-pulse";
      case EAgentState.THINKING:
        return "animate-pulse";
      case EAgentState.SPEAKING:
        return "animate-pulse";
      case EAgentState.SILENT:
        return "opacity-50";
      default:
        return "";
    }
  };

  // Get state-specific icon/content
  const getStateContent = () => {
    switch (agentState) {
      case EAgentState.LISTENING:
        return (
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        );
      case EAgentState.THINKING:
        return (
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "400ms" }} />
          </div>
        );
      case EAgentState.SPEAKING:
        return (
          <div className="flex items-center justify-center gap-1">
            <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
            <div className="w-1 h-6 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
            <div className="w-1 h-5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
            <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
          </div>
        );
      default:
        return null;
    }
  };

  // Get state label
  const getStateLabel = () => {
    switch (agentState) {
      case EAgentState.IDLE:
        return "Idle";
      case EAgentState.LISTENING:
        return "Listening";
      case EAgentState.THINKING:
        return "Thinking";
      case EAgentState.SPEAKING:
        return "Speaking";
      case EAgentState.SILENT:
        return "Silent";
      default:
        return "";
    }
  };

  return (
    <div
      id={`agent-${agentUid}`}
      className={`relative bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 rounded-lg overflow-hidden h-full w-full flex flex-col items-center justify-center text-white shadow-lg ${getStateStyles()}`}
    >
      {/* Agent Avatar/Icon */}
      <div className="flex flex-col items-center justify-center flex-1 p-4">
        {/* Bot Icon */}
        <div className="w-24 h-24 rounded-full bg-white/20 dark:bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm">
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-12 h-12 text-white"
          >
            <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-3 9a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1z" />
          </svg>
        </div>

        {/* State Animation */}
        {getStateContent()}

        {/* State Label */}
        <div className="mt-2 text-sm font-medium opacity-90">{getStateLabel()}</div>
      </div>

      {/* Agent Name Label */}
      <div className="absolute bottom-2 left-2 right-2 bg-gray-900/70 dark:bg-gray-800/70 backdrop-blur-sm px-3 py-1.5 rounded-md text-sm z-10 flex items-center justify-between">
        <span className="font-medium truncate">{agentName}</span>
        <span className="flex items-center ml-2">
          <MdMic
            size={16}
            className="text-green-400"
            title="Agent Active"
          />
        </span>
      </div>
    </div>
  );
};

export default AgentTile;
