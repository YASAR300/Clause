"use client";

import { useEffect, useRef } from "react";
import { X, ExternalLink, FileText, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/viewer/PdfViewer";
import { DocxViewer } from "@/components/viewer/DocxViewer";

function SinglePaneViewer({ document, quoteText, startOffset }) {
  const containerRef = useRef(null);

  // If PDF and blobUrl exists
  const isPdf =
    document?.mimeType?.includes("pdf") ||
    document?.name?.toLowerCase().endsWith(".pdf");

  // If DOCX
  const isDocx =
    document?.mimeType?.includes("word") ||
    document?.name?.toLowerCase().endsWith(".docx");

  // Auto-scroll for plain text fallback
  useEffect(() => {
    if (!isPdf && !isDocx && containerRef.current && startOffset != null) {
      const el = containerRef.current.querySelector("[data-highlight='true']");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [isPdf, isDocx, startOffset]);

  if (!document) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-xs text-muted">
        Document content not available.
      </div>
    );
  }

  if (isPdf && (document.blobUrl || document.id)) {
    const citation = quoteText ? { quoteText, startOffset } : null;
    return (
      <div className="h-full w-full overflow-hidden bg-[#09090b]">
        <PdfViewer
          documentId={document.id}
          blobUrl={document.blobUrl}
          documentName={document.name}
          citation={citation}
          fullText={document.fullText || ""}
        />
      </div>
    );
  }

  if (isDocx) {
    const citation = quoteText ? { quoteText, startOffset } : null;
    return (
      <div className="h-full w-full overflow-hidden bg-[#09090b]">
        <DocxViewer
          documentId={document.id}
          documentName={document.name}
          citation={citation}
          fullText={document.fullText || ""}
        />
      </div>
    );
  }

  // Fallback: Full text reader with highlight
  const text = document.fullText || "";
  let before = text;
  let match = "";
  let after = "";

  if (quoteText && text.includes(quoteText)) {
    const idx = text.indexOf(quoteText);
    before = text.slice(0, idx);
    match = quoteText;
    after = text.slice(idx + quoteText.length);
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto p-6 text-xs text-[#d4d4d8] leading-relaxed font-sans whitespace-pre-wrap select-text bg-[#0c0c0e]"
    >
      {match ? (
        <>
          <span>{before}</span>
          <mark
            data-highlight="true"
            className="bg-[#3b82f6]/30 text-white border-b-2 border-[#3b82f6] px-1 py-0.5 rounded shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse"
          >
            {match}
          </mark>
          <span>{after}</span>
        </>
      ) : (
        <span>{text || "No extracted text available for this document."}</span>
      )}
    </div>
  );
}

export function SplitDocViewerModal({
  isOpen,
  onClose,
  change,
  baseDocument,
  revisedDocument,
}) {
  if (!isOpen || !change) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 bg-[#09090b] border-[#222226] text-text overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#222226] bg-[#121215] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold text-sm text-text truncate">
              {change.heading || "Contract Clause Inspection"}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-mono uppercase ${
                change.significance === "CRITICAL"
                  ? "border-[#ef4444]/40 bg-[#ef4444]/15 text-[#ef4444]"
                  : change.significance === "MAJOR"
                  ? "border-[#f59e0b]/40 bg-[#f59e0b]/15 text-[#f59e0b]"
                  : "border-[#3b82f6]/40 bg-[#3b82f6]/15 text-[#3b82f6]"
              }`}
            >
              {change.significance}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono text-muted">
              {change.category}
            </Badge>
          </div>
        </div>

        {/* Side-by-side Subheaders */}
        <div className="grid grid-cols-2 border-b border-[#222226] bg-[#101012] text-xs shrink-0">
          <div className="px-5 py-2 flex items-center justify-between border-r border-[#222226]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[10px] text-muted uppercase tracking-wider font-semibold">
                Base Document:
              </span>
              <span className="font-medium text-text truncate max-w-sm" title={baseDocument?.name}>
                {baseDocument?.name}
              </span>
            </div>
          </div>
          <div className="px-5 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[10px] text-[#10b981] uppercase tracking-wider font-semibold">
                Revised Document:
              </span>
              <span className="font-medium text-text truncate max-w-sm" title={revisedDocument?.name}>
                {revisedDocument?.name}
              </span>
            </div>
          </div>
        </div>

        {/* Dual Pane Viewport */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#222226] flex-1 min-h-0 bg-[#0c0c0e]">
          <SinglePaneViewer
            document={baseDocument}
            quoteText={change.baseText}
            startOffset={change.baseStart}
          />
          <SinglePaneViewer
            document={revisedDocument}
            quoteText={change.revisedText}
            startOffset={change.revisedStart}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
