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

  const finalTranscripts = transcripts.filter((t) => t.isFinal);
  const wordCount = finalTranscripts.reduce(
    (acc, t) => acc + t.text.split(" ").length,
    0,
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Background — same as landing/setup */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(0,194,255,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_100%,rgba(0,194,255,0.05),transparent_45%)]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--agora-accent-blue)]/20 bg-[var(--agora-accent-blue)]/5 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--agora-accent-blue)]" />
            <span className="text-sm font-medium text-[var(--agora-accent-blue)]">
              Podcast Complete
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-syne mb-2">
            {config?.topic || "Podcast Complete"}
          </h1>
          <p className="text-sm text-gray-500">
            Great conversation between{" "}
            <span className="text-gray-400">{config?.hostAvatar.name}</span>
            {" and "}
            <span className="text-gray-400">{config?.guestAvatar.name}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Duration", value: formatDuration(timer.elapsed) },
            { label: "Turns", value: String(finalTranscripts.length) },
            { label: "Words", value: String(wordCount) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center"
            >
              <span className="block text-2xl font-bold text-white">
                {stat.value}
              </span>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Transcript */}
        <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] mb-8">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-medium text-gray-300">
              Full Transcript
            </h3>
            <button
              onClick={handleCopyTranscript}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--agora-accent-blue)]/10 text-[var(--agora-accent-blue)] hover:bg-[var(--agora-accent-blue)]/20 transition-colors"
            >
              {copied ? "Copied!" : "Copy Transcript"}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-5 space-y-4">
            {finalTranscripts.map((entry, idx) => (
              <div key={idx} className="flex gap-3">
                <div
                  className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    entry.role === "host"
                      ? "bg-[var(--agora-accent-blue)]"
                      : "bg-rose-400"
                  }`}
                />
                <div>
                  <span
                    className={`text-xs font-semibold ${
                      entry.role === "host"
                        ? "text-[var(--agora-accent-blue)]"
                        : "text-rose-400"
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

            {finalTranscripts.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                No transcript entries recorded.
              </p>
            )}
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-4">
          <div className="flex-1 relative rounded-xl animate-landing-button-glow">
            <button
              onClick={handleStartNew}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--agora-accent-blue)] text-white font-semibold shadow-lg hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
            >
              Start New Podcast
            </button>
          </div>
          <button
            onClick={() => router.push("/podcast")}
            className="px-6 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white font-medium transition-colors border border-white/[0.06]"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PodcastEndedScreen;
