"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ExternalLink, FileText, SearchCode } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const DOC_STYLES = {
  D1: {
    chip: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/35 hover:bg-[#3b82f6]/25 hover:border-[#3b82f6]/50 shadow-[0_0_8px_rgba(59,130,246,0.15)]",
    text: "text-[#3b82f6]",
    border: "border-[#3b82f6]",
  },
  D2: {
    chip: "bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/35 hover:bg-[#a855f7]/25 hover:border-[#a855f7]/50 shadow-[0_0_8px_rgba(168,85,247,0.15)]",
    text: "text-[#a855f7]",
    border: "border-[#a855f7]",
  },
  D3: {
    chip: "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/35 hover:bg-[#06b6d4]/25 hover:border-[#06b6d4]/50 shadow-[0_0_8px_rgba(6,182,212,0.15)]",
    text: "text-[#06b6d4]",
    border: "border-[#06b6d4]",
  },
  D4: {
    chip: "bg-[#ec4899]/15 text-[#ec4899] border-[#ec4899]/35 hover:bg-[#ec4899]/25 hover:border-[#ec4899]/50 shadow-[0_0_8px_rgba(236,72,153,0.15)]",
    text: "text-[#ec4899]",
    border: "border-[#ec4899]",
  },
};

const DEFAULT_VERIFIED = {
  chip: "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30 hover:bg-[#10b981]/25 hover:border-[#10b981]/50 shadow-[0_0_8px_rgba(16,185,129,0.15)]",
  text: "text-[#10b981]",
  border: "border-[#10b981]",
};

const UNVERIFIED_STYLE = {
  chip: "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30 hover:bg-[#f59e0b]/25 hover:border-[#f59e0b]/50 shadow-[0_0_8px_rgba(245,158,11,0.15)]",
  text: "text-[#f59e0b]",
  border: "border-[#f59e0b]/50",
};

/**
 * Inline citation chip component:
 * - Green verified chip with page indicator and quote viewer popover
 * - Amber unverified chip with warning explanation
 * - Triggers side drawer CitationInspector on demand
 */
export function CitationChip({ citation, fallbackOrdinal = 1, onInspect }) {
  const [open, setOpen] = useState(false);

  if (!citation) {
    return (
      <span className="inline-flex items-center justify-center font-mono text-[10px] h-4 min-w-4 px-1 rounded bg-[#27272a] text-[#a1a1aa] align-baseline mx-0.5 select-none">
        [{fallbackOrdinal}]
      </span>
    );
  }

  const isVerified = Boolean(citation.verified);
  const docLabel = citation.docLabel || null;
  const style = !isVerified
    ? UNVERIFIED_STYLE
    : (docLabel && DOC_STYLES[docLabel]) || DEFAULT_VERIFIED;

  const pageLabel =
    citation.pageStart === citation.pageEnd
      ? `p. ${citation.pageStart}`
      : `pp. ${citation.pageStart}–${citation.pageEnd}`;

  const handleInspectClick = (e) => {
    e.stopPropagation();
    setOpen(false);
    if (onInspect) {
      onInspect(citation);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Citation ${citation.ordinal}: ${isVerified ? "Verified" : "Unverified"}`}
          className={`inline-flex items-center justify-center font-mono text-[11px] font-semibold h-4 min-w-4 px-1.5 rounded transition-all select-none mx-0.5 align-baseline cursor-pointer border ${style.chip}`}
        >
          {docLabel && <span className="opacity-75 text-[9px] mr-0.5">{docLabel}:</span>}
          <span>{citation.ordinal}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        side="top"
        collisionPadding={16}
        className="w-[calc(100vw-32px)] max-w-sm sm:w-96 p-3 bg-[#121214] border border-[#27272a] shadow-2xl rounded-lg text-xs z-50"
      >
        {/* Header Badge */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#27272a]">
          <div className="flex items-center gap-1.5">
            {isVerified ? (
              <>
                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${style.text}`} />
                <span className={`font-medium ${style.text}`}>
                  {docLabel ? `[${docLabel}] ` : ""}Verified — {pageLabel}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-[#f59e0b] shrink-0" />
                <span className="font-medium text-[#f59e0b]">
                  {docLabel ? `[${docLabel}] ` : ""}Unverified — not found in document
                </span>
              </>
            )}
          </div>

          {citation.matchCount > 1 && (
            <span className="text-[10px] font-mono text-[#71717a] bg-[#18181b] px-1.5 py-0.5 rounded border border-[#27272a]">
              {citation.matchCount} matches
            </span>
          )}
        </div>

        {/* Quoted Passage */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] flex items-center justify-between">
            <span>Ground-Truth Quote</span>
            {citation.documentName && (
              <span className="truncate max-w-[140px] text-[#a1a1aa] flex items-center gap-1">
                <FileText className="h-2.5 w-2.5" />
                {docLabel ? `[${docLabel}] ` : ""}{citation.documentName}
              </span>
            )}
          </div>

          <blockquote
            className={`p-2 rounded text-[11px] leading-relaxed font-mono ${
              isVerified
                ? `bg-[#18181b] text-[#ededed] border-l-2 ${style.border}`
                : "bg-[#18181b]/50 text-[#71717a] italic border-l-2 border-[#f59e0b]/50"
            }`}
          >
            &ldquo;{citation.quoteText}&rdquo;
          </blockquote>

          {!isVerified && citation.failureReason && (
            <p className="text-[10px] text-[#f59e0b] mt-1">
              Reason: {citation.failureReason}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="pt-2.5 mt-2.5 border-t border-[#27272a] flex items-center justify-between gap-2">
          {onInspect ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInspectClick}
              className="h-7 px-2.5 text-[11px] font-medium border-[#27272a] text-[#ededed] hover:bg-[#18181b] gap-1.5"
            >
              <SearchCode className="h-3 w-3 text-[#3b82f6]" />
              Inspect Offsets
            </Button>
          ) : (
            <span />
          )}

          {citation.documentId && isVerified && (
            <Link
              href={
                citation.id
                  ? `/documents/${citation.documentId}?cite=${citation.id}`
                  : `/documents/${citation.documentId}`
              }
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
            >
              Open in document
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
