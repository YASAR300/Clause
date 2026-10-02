"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEFAULT_SUGGESTIONS = [
  "What is the payment term and notice requirement?",
  "Is there a termination for convenience clause?",
  "What are the indemnification obligations?",
  "Does the contract mention force majeure or excusable delays?",
];

/**
 * Chat input composer with auto-growing textarea, suggested questions chips,
 * Enter to send, Shift+Enter for newlines, and streaming Stop button.
 */
export function ChatComposer({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  disabledReason = "",
  showSuggestions = false,
  suggestions = DEFAULT_SUGGESTIONS,
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (disabled || isStreaming) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    if (disabled || isStreaming) return;
    onSend(suggestion);
  };

  return (
    <div className="w-full space-y-3">
      {/* Suggestions chips */}
      {showSuggestions && suggestions.length > 0 && !isStreaming && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
            <Sparkles className="h-3 w-3 text-[#3b82f6]" />
            <span>Suggested questions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="px-3 py-1.5 rounded-full bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-xs text-[#a1a1aa] hover:text-[#ededed] transition-all text-left shadow-sm active:scale-[0.98]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Disabled warning if document not ready */}
      {disabled && disabledReason && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-xs text-[#f59e0b]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}

      {/* Input box */}
      <div className="relative flex items-end gap-2 p-2 rounded-xl bg-[#121214] border border-[#27272a] focus-within:border-[#3b82f6] focus-within:ring-1 focus-within:ring-[#3b82f6]/40 transition-all shadow-lg">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Select a document in READY status to chat..."
              : "Ask a contract question (e.g. payment terms, termination)..."
          }
          disabled={disabled}
          rows={1}
          className="flex-1 max-h-44 bg-transparent text-xs sm:text-sm text-[#ededed] placeholder:text-[#71717a] resize-none focus:outline-none p-1.5 leading-relaxed disabled:opacity-50"
        />

        {isStreaming ? (
          <Button
            type="button"
            size="sm"
            onClick={onStop}
            className="h-8 w-8 p-0 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white shrink-0 shadow-sm transition-transform active:scale-95"
            aria-label="Stop generating answer"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="h-8 w-8 p-0 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white shrink-0 shadow-sm transition-transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Send contract inquiry"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#71717a] px-1 font-mono">
        <span>Press Enter to send, Shift + Enter for new line</span>
        <span>Word-for-word offset verification</span>
      </div>
    </div>
  );
}
