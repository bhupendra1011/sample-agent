// src/components/podcast/PodcastTranscriptPanel.tsx
"use client";

import React, { useRef, useEffect, useState } from "react";
import usePodcastStore from "@/store/usePodcastStore";

const PodcastTranscriptPanel: React.FC = () => {
  const transcripts = usePodcastStore((s) => s.transcripts);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-white/10">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Transcript
        </h3>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {transcripts.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-8">
            Transcript will appear here when the podcast begins...
          </p>
        )}

        {transcripts.map((entry, idx) => (
          <div key={`${entry.turnId}-${entry.uid}-${idx}`} className="flex gap-3">
            {/* Role indicator */}
            <div
              className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                entry.role === "host" ? "bg-purple-500" : "bg-pink-500"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span
                  className={`text-xs font-semibold ${
                    entry.role === "host" ? "text-purple-400" : "text-pink-400"
                  }`}
                >
                  {entry.speakerName}
                </span>
                <span className="text-[10px] text-gray-600">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${entry.isFinal ? "text-gray-200" : "text-gray-400"}`}>
                {entry.text}
                {!entry.isFinal && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-gray-400 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PodcastTranscriptPanel;
