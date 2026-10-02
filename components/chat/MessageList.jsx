"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  RotateCw,
  ArrowDown,
  Bot,
  User,
  Loader2,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  SearchCode,
} from "lucide-react";
import { toast } from "sonner";
import { MessageContent } from "./MessageContent";
import { CoverageIndicator } from "./CoverageIndicator";
import { SourcesList } from "./SourcesList";
import { NotFoundCard } from "./NotFoundCard";
import { AgentActivityTimeline } from "./AgentActivityTimeline";
import { Button } from "@/components/ui/button";

/**
 * Renders the conversation message stream with auto-scroll management,
 * verified citations, copy answer, and jump-to-latest button.
 */
export function MessageList({
  messages = [],
  isStreaming = false,
  streamingMessageId = null,
  onRetry,
  onInspect,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);
  const [ratedIds, setRatedIds] = useState({});
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isAutoScrollPausedRef = useRef(false);

  // Monitor scroll position: pause auto-scroll if user scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 100;

    isAutoScrollPausedRef.current = !isNearBottom;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = (behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Scroll on message change or streaming tokens unless paused
  useEffect(() => {
    if (!isAutoScrollPausedRef.current) {
      scrollToBottom(isStreaming ? "auto" : "smooth");
    }
  }, [messages, isStreaming]);

  const handleCopy = async (message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      toast.success("Answer copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy answer");
    }
  };

  const handleRate = (messageId, rating) => {
    setRatedIds((prev) => ({ ...prev, [messageId]: rating }));
    toast.success(
      rating === "up"
        ? "Helpful verification marked"
        : "Feedback recorded for model audit"
    );
  };

  return (
    <div className="relative flex-1 min-h-0 h-full overflow-hidden flex flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 h-full overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin"
      >
        {messages.map((message) => {
          const isUser = message.role === "USER";
          const isStreamingThis = message.id === streamingMessageId && isStreaming;
          const citations = message.citations || [];
          const userRating = ratedIds[message.id];

          return (
            <div
              key={message.id}
              className={`flex items-start gap-3 max-w-4xl mx-auto ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border text-xs shadow-sm ${
                  isUser
                    ? "bg-[#3b82f6]/20 border-[#3b82f6]/40 text-[#60a5fa]"
                    : "bg-[#18181b] border-[#27272a] text-[#ededed]"
                }`}
              >
                {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>

              {/* Message Bubble & Content */}
              <div
                className={`flex-1 min-w-0 rounded-xl p-4 transition-all shadow-sm ${
                  isUser
                    ? "bg-[#18181b] border border-[#27272a] text-[#ededed] max-w-[85%] sm:max-w-[75%]"
                    : "bg-[#121215] border border-[#222226] text-[#ededed] space-y-3"
                }`}
              >
                {isUser ? (
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                ) : (
                  <>
                    {/* Assistant Header info bar */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#222226] text-[11px] font-mono text-[#71717a]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#ededed]">Clause AI</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#10b981] px-1.5 py-0.2 rounded bg-[#10b981]/10 border border-[#10b981]/20">
                          <ShieldCheck className="h-3 w-3" />
                          Ground Truth
                        </span>
                      </div>

                      {citations.length > 0 && onInspect && (
                        <button
                          type="button"
                          onClick={() => onInspect(citations[0])}
                          className="inline-flex items-center gap-1 text-[10px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                        >
                          <SearchCode className="h-3 w-3" />
                          <span>Inspect Citations ({citations.length})</span>
                        </button>
                      )}
                    </div>

                    {/* Agent Research Timeline */}
                    {((message.toolTrace && message.toolTrace.length > 0) || (isStreamingThis && !message.content)) && (
                      <AgentActivityTimeline
                        toolTrace={message.toolTrace || []}
                        isStreaming={isStreamingThis}
                        activeRound={message.activeRound}
                      />
                    )}

                    {/* Assistant answer content */}
                    {message.isNotFound ? (
                      <NotFoundCard
                        explanation={message.content}
                        coverage={message.coverage}
                      />
                    ) : message.content ? (
                      <MessageContent
                        content={message.content}
                        citations={citations}
                        onInspect={onInspect}
                      />
                    ) : null}

                    {/* Streaming indicator */}
                    {isStreamingThis && (
                      <div className="flex items-center gap-2 pt-1 text-xs text-[#71717a] font-mono">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3b82f6]" />
                        <span>Verifying quotes in ground-truth text...</span>
                      </div>
                    )}

                    {/* Stopped or Error tags */}
                    {message.status === "STOPPED" && (
                      <div className="inline-block px-2 py-0.5 rounded bg-[#27272a] text-[10px] font-mono text-[#a1a1aa] border border-[#3f3f46]">
                        Generation stopped by user
                      </div>
                    )}

                    {message.status === "ERROR" && (
                      <div className="flex items-center gap-2 p-2 rounded bg-[#ef4444]/10 border border-[#ef4444]/20 text-xs text-[#ef4444]">
                        <span>Generation interrupted.</span>
                        {onRetry && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRetry(message)}
                            className="h-6 px-2 text-xs text-[#ef4444] hover:bg-[#ef4444]/20"
                          >
                            <RotateCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Coverage Indicator */}
                    {message.coverage && (
                      <div className="pt-2">
                        <CoverageIndicator coverage={message.coverage} />
                      </div>
                    )}

                    {/* Sources list */}
                    {citations.length > 0 && (
                      <SourcesList citations={citations} onInspect={onInspect} />
                    )}

                    {/* Message Actions */}
                    {!isStreamingThis && message.content && (
                      <div className="flex items-center justify-between pt-2 border-t border-[#222226] text-xs text-[#71717a]">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRate(message.id, "up")}
                            className={`p-1 rounded hover:text-[#ededed] hover:bg-[#18181b] transition-colors ${
                              userRating === "up" ? "text-[#10b981]" : ""
                            }`}
                            aria-label="Helpful answer"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRate(message.id, "down")}
                            className={`p-1 rounded hover:text-[#ededed] hover:bg-[#18181b] transition-colors ${
                              userRating === "down" ? "text-[#ef4444]" : ""
                            }`}
                            aria-label="Unhelpful answer"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(message)}
                          className="inline-flex items-center gap-1 hover:text-[#ededed] px-2 py-1 rounded hover:bg-[#18181b] transition-colors"
                          aria-label="Copy answer to clipboard"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="h-3 w-3 text-[#10b981]" />
                              <span className="text-[10px] text-[#10b981]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span className="text-[10px]">Copy Answer</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Floating Jump to Latest Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => {
            isAutoScrollPausedRef.current = false;
            scrollToBottom();
          }}
          className="absolute bottom-4 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] shadow-xl text-xs text-[#ededed] hover:bg-[#27272a] transition-all animate-in fade-in"
          aria-label="Jump to latest answer"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          <span>Jump to latest</span>
        </button>
      )}
    </div>
  );
}
