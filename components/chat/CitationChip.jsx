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
          className={`inline-flex items-center justify-center font-mono text-[11px] font-semibold h-4 min-w-4 px-1.5 rounded transition-all select-none mx-0.5 align-baseline cursor-pointer ${
            isVerified
              ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/25 hover:border-[#10b981]/50 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
              : "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30 hover:bg-[#f59e0b]/25 hover:border-[#f59e0b]/50 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
          }`}
        >
          {citation.ordinal}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        side="top"
        className="w-80 sm:w-96 p-3 bg-[#121214] border border-[#27272a] shadow-2xl rounded-lg text-xs z-50"
      >
        {/* Header Badge */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#27272a]">
          <div className="flex items-center gap-1.5">
            {isVerified ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981] shrink-0" />
                <span className="font-medium text-[#10b981]">
                  Verified — {pageLabel}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-[#f59e0b] shrink-0" />
                <span className="font-medium text-[#f59e0b]">
                  Unverified — not found in document
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
                {citation.documentName}
              </span>
            )}
          </div>

          <blockquote
            className={`p-2 rounded text-[11px] leading-relaxed font-mono ${
              isVerified
                ? "bg-[#18181b] text-[#ededed] border-l-2 border-[#10b981]"
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
              href={`/documents?id=${citation.documentId}`}
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
