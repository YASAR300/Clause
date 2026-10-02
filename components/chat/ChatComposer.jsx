"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Square,
  AlertCircle,
  Sparkles,
  X,
  Shield,
  CreditCard,
  Scale,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIZED_PROMPTS = [
  {
    icon: Shield,
    label: "Termination",
    prompt: "What are the termination provisions, cure periods, and notice requirements?",
  },
  {
    icon: CreditCard,
    label: "Payment Terms",
    prompt: "What are the payment terms, invoicing schedule, and late fee penalties?",
  },
  {
    icon: Scale,
    label: "Liability Caps",
    prompt: "What is the aggregate liability cap and what carve-outs or exclusions apply?",
  },
  {
    icon: Lock,
    label: "Confidentiality",
    prompt: "What are the confidentiality obligations and how long do they survive termination?",
  },
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
  suggestions,
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

  const handleSelectSuggestion = (promptText) => {
    if (disabled || isStreaming) return;
    onSend(promptText);
  };

  return (
    <div className="w-full space-y-3">
      {/* Suggestions chips */}
      {showSuggestions && !isStreaming && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
            <Sparkles className="h-3 w-3 text-[#3b82f6]" />
            <span>Quick audit queries</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {CATEGORIZED_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item.prompt)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[#141418] hover:bg-[#1a1a20] border border-[#27272a] hover:border-[#3b82f6]/40 text-left transition-all group shadow-sm active:scale-[0.98]"
                >
                  <div className="h-6 w-6 rounded bg-[#1c1c22] border border-[#2d2d34] flex items-center justify-center shrink-0 text-[#71717a] group-hover:text-[#3b82f6] group-hover:border-[#3b82f6]/30 transition-colors">
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#ededed] truncate">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-[#71717a] truncate font-mono">
                      Word-for-word check
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Disabled warning if document not ready */}
      {disabled && disabledReason && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-xs text-[#f59e0b]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}

      {/* Input box */}
      <div className="relative flex items-end gap-2 p-2.5 rounded-xl bg-[#121215] border border-[#27272a] focus-within:border-[#3b82f6] focus-within:ring-1 focus-within:ring-[#3b82f6]/40 transition-all shadow-xl">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? "Select an indexed contract to query..."
              : "Ask any contract question (e.g. termination, liabilities, notice periods)..."
          }
          disabled={disabled}
          rows={1}
          className="flex-1 max-h-44 bg-transparent text-xs sm:text-sm text-[#ededed] placeholder:text-[#71717a] resize-none focus:outline-none p-1.5 leading-relaxed disabled:opacity-50"
        />

        {/* Clear input button */}
        {input && !isStreaming && (
          <button
            type="button"
            onClick={() => setInput("")}
            className="p-1 rounded-md text-[#71717a] hover:text-[#ededed] transition-colors shrink-0 mb-1"
            aria-label="Clear input"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Action Button: Send or Stop */}
        {isStreaming ? (
          <Button
            type="button"
            size="sm"
            onClick={onStop}
            className="h-8 px-3 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white shrink-0 shadow-sm transition-transform active:scale-95 gap-1.5 text-xs font-medium"
            aria-label="Stop generating answer"
          >
            <Square className="h-3 w-3 fill-current animate-pulse" />
            <span className="hidden sm:inline">Stop</span>
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
        <div className="flex items-center gap-2">
          <span>Enter ↵ to send</span>
          <span>•</span>
          <span>Shift + Enter for new line</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
          <span>Character-accurate verification</span>
        </div>
      </div>
    </div>
  );
}
