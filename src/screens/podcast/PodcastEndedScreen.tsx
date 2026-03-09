// src/screens/podcast/PodcastEndedScreen.tsx
"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import usePodcastStore from "@/store/usePodcastStore";
import { podcastDB } from "@/utils/podcast/podcastDB";
import { showToast } from "@/services/uiService";

const PodcastEndedScreen: React.FC = () => {
  const router = useRouter();
  const config = usePodcastStore((s) => s.config);
  const timer = usePodcastStore((s) => s.timer);
  const transcripts = usePodcastStore((s) => s.transcripts);
  const reset = usePodcastStore((s) => s.reset);
  const [copied, setCopied] = useState(false);

  const handleCopyTranscript = useCallback(async () => {
    const text = transcripts
      .filter((t) => t.isFinal)
      .map((t) => `[${t.speakerName}] ${t.text}`)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast("Transcript copied to clipboard", "success");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast("Failed to copy transcript", "error");
    }
  }, [transcripts]);

  const handleStartNew = useCallback(async () => {
    await podcastDB.clearAll();
    reset();
    router.push("/podcast");
  }, [reset, router]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-600/20 border border-green-500/40 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-400">
              Podcast Ended
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {config?.topic || "Podcast Complete"}
          </h1>
          <p className="text-gray-400">
            Great conversation between {config?.hostAvatar.name} and{" "}
            {config?.guestAvatar.name}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900/60 rounded-xl p-4 text-center border border-white/5">
            <span className="block text-2xl font-bold text-white">
              {formatDuration(timer.elapsed)}
            </span>
            <span className="text-xs text-gray-500">Duration</span>
          </div>
          <div className="bg-gray-900/60 rounded-xl p-4 text-center border border-white/5">
            <span className="block text-2xl font-bold text-white">
              {transcripts.filter((t) => t.isFinal).length}
            </span>
            <span className="text-xs text-gray-500">Turns</span>
          </div>
          <div className="bg-gray-900/60 rounded-xl p-4 text-center border border-white/5">
            <span className="block text-2xl font-bold text-white">
              {transcripts
                .filter((t) => t.isFinal)
                .reduce((acc, t) => acc + t.text.split(" ").length, 0)}
            </span>
            <span className="text-xs text-gray-500">Words</span>
          </div>
        </div>

        {/* Transcript */}
        <div className="bg-gray-900/60 rounded-xl border border-white/5 mb-6">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Full Transcript
            </h3>
            <button
              onClick={handleCopyTranscript}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
            >
              {copied ? "Copied!" : "Copy Transcript"}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-5 space-y-4">
            {transcripts
              .filter((t) => t.isFinal)
              .map((entry, idx) => (
                <div key={idx} className="flex gap-3">
                  <div
                    className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      entry.role === "host" ? "bg-purple-500" : "bg-pink-500"
                    }`}
                  />
                  <div>
                    <span
                      className={`text-xs font-semibold ${
                        entry.role === "host"
                          ? "text-purple-400"
                          : "text-pink-400"
                      }`}
                    >
                      {entry.speakerName}
                    </span>
                    <p className="text-sm text-gray-300 leading-relaxed mt-0.5">
                      {entry.text}
                    </p>
                  </div>
                </div>
              ))}

            {transcripts.filter((t) => t.isFinal).length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                No transcript entries recorded.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleStartNew}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg transition-all shadow-lg"
          >
            Start New Podcast
          </button>
          <button
            onClick={() => router.push("/podcast")}
            className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PodcastEndedScreen;
