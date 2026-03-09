// src/components/podcast/AudienceChatPanel.tsx
"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import usePodcastStore from "@/store/usePodcastStore";

interface AudienceChatPanelProps {
  onSendMessage: (text: string, displayName: string) => Promise<void>;
  onSendQuestion: (question: string) => Promise<void>;
}

const AudienceChatPanel: React.FC<AudienceChatPanelProps> = ({
  onSendMessage,
  onSendQuestion,
}) => {
  const messages = usePodcastStore((s) => s.audienceMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInput("");

    try {
      await onSendMessage(text, "Viewer");
    } catch {
      // Ignore send errors
    }

    // Rate limiting: disable for 10s
    setTimeout(() => setIsSending(false), 10000);
  }, [input, isSending, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-white/10">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Audience Chat
        </h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-8">
            Send a message to join the conversation...
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="group">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xs font-semibold text-cyan-400">
                {msg.displayName}
              </span>
              <span className="text-[10px] text-gray-600">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm text-gray-300">{msg.text}</p>
            {msg.isQuestion && (
              <button
                onClick={() => onSendQuestion(msg.text)}
                className="mt-1 text-[10px] px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 transition-colors opacity-0 group-hover:opacity-100"
              >
                Ask the host
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isSending ? "Wait 10s..." : "Type a message..."}
            disabled={isSending}
            className="flex-1 bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudienceChatPanel;
