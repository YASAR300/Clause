"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Hash,
  Layers,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Side drawer panel that inspects an active citation in full legal context.
 * Shows exact offsets, verification status, match count, and direct contract link.
 */
export function CitationInspector({
  citation,
  allCitations = [],
  onClose,
  onSelectCitation,
  documentDetails,
}) {
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!citation) return null;

  const isVerified = Boolean(citation.verified);
  const pageLabel =
    citation.pageStart === citation.pageEnd
      ? `Page ${citation.pageStart}`
      : `Pages ${citation.pageStart}–${citation.pageEnd}`;

  // Find index in allCitations for navigation
  const currentIndex = allCitations.findIndex(
    (c) => c.ordinal === citation.ordinal && c.documentId === citation.documentId
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allCitations.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectCitation) {
      onSelectCitation(allCitations[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectCitation) {
      onSelectCitation(allCitations[currentIndex + 1]);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citation.quoteText);
      setCopied(true);
      toast.success("Quote copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy quote");
    }
  };

  return (
    <aside
      aria-label="Citation Inspector"
      className="w-full sm:w-[380px] lg:w-[420px] h-full flex flex-col bg-[#0c0c0e] border-l border-[#222226] shadow-2xl z-30 animate-in slide-in-from-right duration-200 shrink-0"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#222226] bg-[#121215]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center font-mono text-xs font-bold text-[#ededed] shadow-inner">
            [{citation.ordinal}]
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#ededed] flex items-center gap-1.5">
              <span>Citation Inspector</span>
              <ShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
            </h3>
            <p className="text-[10px] font-mono text-[#71717a]">
              Ground-truth character audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Previous / Next navigation */}
          {allCitations.length > 1 && (
            <div className="flex items-center mr-1 bg-[#18181b] rounded-md border border-[#27272a] p-0.5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!hasPrev}
                aria-label="Previous citation"
                className="p-1 rounded text-[#71717a] hover:text-[#ededed] disabled:opacity-30 disabled:hover:text-[#71717a] transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-mono text-[#71717a] px-1">
                {currentIndex + 1}/{allCitations.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={!hasNext}
                aria-label="Next citation"
                className="p-1 rounded text-[#71717a] hover:text-[#ededed] disabled:opacity-30 disabled:hover:text-[#71717a] transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#71717a] hover:text-[#ededed] hover:bg-[#18181b] transition-colors"
            aria-label="Close citation inspector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Verification Status Banner */}
        <div
          className={`p-3.5 rounded-lg border flex items-start gap-3 ${
            isVerified
              ? "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]"
              : "bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]"
          }`}
        >
          {isVerified ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="font-semibold text-xs flex items-center justify-between">
              <span>{isVerified ? "Verified Ground Truth" : "Unverified Passage"}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/20">
                {pageLabel}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#ededed]/90">
              {isVerified
                ? "This quote was matched character-for-character against the indexed contract text in storage."
                : citation.failureReason ||
                  "Wording differs from the original document text or was paraphrased."}
            </p>
          </div>
        </div>

        {/* Verbatim Quote Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#71717a] font-mono">
            <span className="uppercase tracking-wider">Verbatim Quote</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 hover:text-[#ededed] transition-colors text-[10px] px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a]"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-[#10b981]" />
                  <span className="text-[#10b981]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div
            className={`p-3.5 rounded-lg border leading-relaxed font-mono text-[11px] ${
              isVerified
                ? "bg-[#121215] border-[#27272a] text-[#ededed] shadow-inner"
                : "bg-[#121215]/60 border-[#27272a] text-[#71717a] italic"
            }`}
          >
            &ldquo;{citation.quoteText}&rdquo;
          </div>
        </div>

        {/* Audit Metadata Grid */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
            Offset & Audit Telemetry
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-[#121215] border border-[#222226] space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-[#71717a] font-mono">
                <Hash className="h-3 w-3" />
                <span>Character Span</span>
              </div>
              <p className="font-mono text-xs font-semibold text-[#ededed]">
                {citation.startOffset !== undefined && citation.endOffset !== undefined
                  ? `${citation.startOffset.toLocaleString()} – ${citation.endOffset.toLocaleString()}`
                  : "N/A"}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#121215] border border-[#222226] space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-[#71717a] font-mono">
                <Layers className="h-3 w-3" />
                <span>Occurrences</span>
              </div>
              <p className="font-mono text-xs font-semibold text-[#ededed]">
                {citation.matchCount || 1} in document
              </p>
            </div>
          </div>
        </div>

        {/* Source Document Information Card */}
        <div className="p-3.5 rounded-lg bg-[#121215] border border-[#222226] space-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#71717a]">
            <span className="uppercase tracking-wider">Source Document</span>
            <BookOpen className="h-3.5 w-3.5 text-[#3b82f6]" />
          </div>

          <div className="flex items-start gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center shrink-0 text-[#3b82f6]">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-xs text-[#ededed] truncate">
                {citation.documentName || documentDetails?.name || "Contract Agreement"}
              </p>
              <p className="text-[10px] font-mono text-[#71717a] mt-0.5">
                Exact character offsets verified
              </p>
            </div>
          </div>

          {citation.documentId && (
            <div className="pt-2 border-t border-[#222226] flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-[#27272a] text-[#3b82f6] hover:text-[#60a5fa] hover:bg-[#18181b]"
                asChild
              >
                <Link href={`/documents?id=${citation.documentId}`}>
                  View in Library
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
