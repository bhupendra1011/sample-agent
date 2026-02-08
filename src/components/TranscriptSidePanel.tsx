"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MdClose, MdSend, MdImage, MdTextFields, MdViewHeadline } from "react-icons/md";
import useAppStore from "@/store/useAppStore";
import type { ITranscriptHelperItem } from "@/types/agora";
import { ETurnStatus, ETranscriptRenderMode } from "@/types/agora";

interface TranscriptSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (text: string, image?: File) => void;
}

const TranscriptSidePanel: React.FC<TranscriptSidePanelProps> = ({
  isOpen,
  onClose,
  onSendMessage,
}) => {
  const transcriptItems = useAppStore((state) => state.transcriptItems);
  const currentInProgressMessage = useAppStore(
    (state) => state.currentInProgressMessage
  );
  const transcriptionMode = useAppStore((state) => state.transcriptionMode);
  const transcriptRenderMode = useAppStore((state) => state.transcriptRenderMode);
  const setTranscriptRenderMode = useAppStore(
    (state) => state.setTranscriptRenderMode
  );
  const agentRtcUid = useAppStore((state) => state.agentRtcUid);
  const localUID = useAppStore((state) => state.localUID);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const prevMessageLengthRef = useRef(0);
  const prevInProgressTextRef = useRef("");

  // Smart auto-scroll: only scroll if user is near bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  }, []);

  // Auto-scroll when new messages arrive (only if user is at bottom)
  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevMessageLengthRef.current;
    const inProgressChanged =
      currentInProgressMessage?.text !== prevInProgressTextRef.current;

    if ((hasNewMessage || inProgressChanged) && shouldAutoScroll) {
      scrollToBottom();
    }

    prevMessageLengthRef.current = transcriptItems.length;
    prevInProgressTextRef.current = currentInProgressMessage?.text || "";
  }, [transcriptItems, currentInProgressMessage, shouldAutoScroll, scrollToBottom]);

  const handleSendMessage = () => {
    if (!messageText.trim() && !imageFile) return;
    if (onSendMessage) {
      onSendMessage(messageText, imageFile || undefined);
      setMessageText("");
      setImageFile(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusIndicator = (status: ETurnStatus) => {
    switch (status) {
      case ETurnStatus.IN_PROGRESS:
        return (
          <span className="inline-flex items-center gap-1 text-xs text-blue-500">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Speaking...
          </span>
        );
      case ETurnStatus.INTERRUPTED:
        return (
          <span className="text-xs text-orange-500 italic">Interrupted</span>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const isRTMMode = transcriptionMode === "rtm";
  const canSendMessages = isRTMMode && agentRtcUid && onSendMessage;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white dark:bg-gray-900 z-50 shadow-2xl flex flex-col transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Live Transcript
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    transcriptionMode === "rtm"
                      ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                      : "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  Transmission: {transcriptionMode.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MdClose className="text-gray-500 dark:text-gray-400" size={24} />
          </button>
        </div>

        {/* Render Mode Toggle */}
        <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Render Mode:
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setTranscriptRenderMode(ETranscriptRenderMode.TEXT)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                transcriptRenderMode === ETranscriptRenderMode.TEXT
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              title="Text mode: Show full text at once"
            >
              <MdTextFields size={14} />
            </button>
            <button
              onClick={() => setTranscriptRenderMode(ETranscriptRenderMode.WORD)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                transcriptRenderMode === ETranscriptRenderMode.WORD
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              title="Word mode: Animate word-by-word"
            >
              <MdViewHeadline size={14} />
            </button>
            <button
              onClick={() => setTranscriptRenderMode(ETranscriptRenderMode.AUTO)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                transcriptRenderMode === ETranscriptRenderMode.AUTO
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              title="Auto mode: Detect automatically"
            >
              Auto
            </button>
          </div>
        </div>

        {/* Transcript Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50 dark:bg-gray-900/50 scroll-smooth"
        >
          {transcriptItems.length === 0 && !currentInProgressMessage ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <p className="text-sm">No transcript available yet.</p>
              <p className="text-xs mt-2">
                {isRTMMode
                  ? "Waiting for conversation to start..."
                  : "Transcript will appear here when the agent speaks."}
              </p>
            </div>
          ) : (
            <>
              {/* Render completed messages */}
              {transcriptItems.map((item, index) => {
                const isAgent = item.uid === agentRtcUid || item.uid === "0";
                const isUser = item.uid === String(localUID);

                return (
                  <div
                    key={`${item.turn_id}-${item.stream_id}-${index}`}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        isUser
                          ? "bg-blue-500 dark:bg-blue-600 text-white"
                          : isAgent
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium opacity-80">
                          {isUser
                            ? "You"
                            : isAgent
                            ? "AI Agent"
                            : `User ${item.uid}`}
                        </span>
                        <span className="text-xs opacity-60">
                          {formatTime(item._time)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {item.text}
                      </p>
                      {getStatusIndicator(item.status)}
                    </div>
                  </div>
                );
              })}

              {/* Render in-progress message separately with animation */}
              {currentInProgressMessage && (
                <div
                  className={`flex ${
                    currentInProgressMessage.uid === String(localUID)
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      currentInProgressMessage.uid === String(localUID)
                        ? "bg-blue-500 dark:bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                    } ${
                      transcriptRenderMode === ETranscriptRenderMode.WORD
                        ? "animate-pulse"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium opacity-80">
                        {currentInProgressMessage.uid === String(localUID)
                          ? "You"
                          : currentInProgressMessage.uid === agentRtcUid ||
                            currentInProgressMessage.uid === "0"
                          ? "AI Agent"
                          : `User ${currentInProgressMessage.uid}`}
                      </span>
                      <span className="text-xs opacity-60">
                        {formatTime(currentInProgressMessage._time)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {currentInProgressMessage.text}
                      {transcriptRenderMode === ETranscriptRenderMode.WORD && (
                        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                      )}
                    </p>
                    {getStatusIndicator(currentInProgressMessage.status)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* RTM Mode: Message Input */}
        {canSendMessages && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="space-y-3">
              {imageFile && (
                <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <MdImage size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                    {imageFile.name}
                  </span>
                  <button
                    onClick={() => setImageFile(null)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <label className="flex items-center justify-center w-10 h-10 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <MdImage className="text-gray-600 dark:text-gray-300" size={20} />
                </label>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() && !imageFile}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <MdSend size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TranscriptSidePanel;
