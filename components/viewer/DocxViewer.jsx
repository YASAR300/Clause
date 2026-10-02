"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Loader2, AlertCircle, FileText, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HighlightOverlay } from "./HighlightOverlay";
import {
  locateInDom,
  getHighlightRects,
  scrollHighlightIntoView,
} from "@/lib/highlight";

/**
 * DOCX Document Viewer with docx-preview, mammoth HTML fallback,
 * paragraph numbering, and citation highlights.
 */
export function DocxViewer({
  documentId,
  documentName = "Agreement.docx",
  citation = null,
  fullText = "",
  onFindInDoc,
  onDismissCitation,
}) {
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renderedWithFallback, setRenderedWithFallback] = useState(false);

  const [highlightRects, setHighlightRects] = useState([]);
  const [highlightFailed, setHighlightFailed] = useState(false);

  // Load and render DOCX file
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadDocx() {
      try {
        const res = await fetch(`/api/documents/${documentId}/file`);
        if (!res.ok) throw new Error("Failed to download DOCX file from storage");

        const arrayBuffer = await res.arrayBuffer();
        if (!isMounted) return;

        const docxContainer = containerRef.current;
        if (!docxContainer) return;
        docxContainer.innerHTML = "";

        // Primary renderer: docx-preview
        try {
          const { renderAsync } = await import("docx-preview");
          await renderAsync(arrayBuffer, docxContainer, null, {
            className: "clause-docx-content",
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: false,
          });
        } catch (docxPreviewErr) {
          console.warn("docx-preview failed, attempting mammoth HTML fallback:", docxPreviewErr?.message);

          // Fallback renderer: mammoth
          const mammoth = await import("mammoth");
          const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

          if (!isMounted) return;
          docxContainer.innerHTML = `<div class="clause-mammoth-content p-8">${html}</div>`;
          setRenderedWithFallback(true);
        }

        // Add section/paragraph numbering indicators
        const paragraphs = docxContainer.querySelectorAll("p, h1, h2, h3, h4");
        paragraphs.forEach((p, idx) => {
          p.setAttribute("data-paragraph-index", `${idx + 1}`);
        });

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to parse DOCX document.");
        setLoading(false);
      }
    }

    loadDocx();

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  // Compute and apply citation highlight
  const applyCitationHighlight = useCallback(() => {
    if (!citation || !citation.quoteText || !containerRef.current) {
      setHighlightRects([]);
      setHighlightFailed(false);
      return;
    }

    const matches = locateInDom(containerRef.current, citation.quoteText, {
      findAll: true,
      hintOffset: citation.startOffset,
    });

    if (matches.length > 0) {
      const bestMatch = matches[0];
      const rects = getHighlightRects(bestMatch.range, containerRef.current);

      if (rects.length > 0) {
        setHighlightRects(rects);
        setHighlightFailed(false);
        scrollHighlightIntoView(containerRef.current, rects, scrollContainerRef.current);
      } else {
        setHighlightFailed(true);
      }
    } else {
      setHighlightFailed(true);
    }
  }, [citation]);

  useEffect(() => {
    if (!loading && !error) {
      // Allow DOM repaint
      const timer = setTimeout(applyCitationHighlight, 120);
      return () => clearTimeout(timer);
    }
  }, [citation, loading, error, applyCitationHighlight]);

  // Keyboard dismiss (Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setHighlightRects([]);
        onDismissCitation?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismissCitation]);

  // Surrounding excerpt context for fallback panel
  const fallbackContext = useMemo(() => {
    if (!citation || !fullText) return null;
    const start = Math.max(0, (citation.startOffset || 0) - 150);
    const end = Math.min(fullText.length, (citation.endOffset || 0) + 150);
    return fullText.slice(start, end);
  }, [citation, fullText]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#09090b]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6] mb-3" />
        <p className="text-xs text-[#ededed] font-medium">Opening DOCX contract...</p>
        <p className="text-[11px] text-[#71717a] font-mono mt-1">Rendering sections and paragraph numbers</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#09090b] space-y-3">
        <AlertCircle className="h-8 w-8 text-[#ef4444]" />
        <p className="text-xs text-[#ef4444] font-medium">{error}</p>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="text-xs">
          Reload document
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0c0e] relative overflow-hidden">
      {/* Fallback Banner: Couldn't highlight passage */}
      {highlightFailed && citation && (
        <div className="p-3 bg-[#f59e0b]/10 border-b border-[#f59e0b]/30 text-xs text-[#f59e0b] flex items-start justify-between gap-3 shrink-0 z-20">
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-xs">
                Couldn&apos;t highlight this passage visually in the document
              </p>
              <p className="text-[11px] font-mono text-[#ededed] line-clamp-2">
                &ldquo;{citation.quoteText}&rdquo;
              </p>
              {fallbackContext && (
                <p className="text-[10px] text-[#a1a1aa] font-mono line-clamp-1 italic">
                  Context: ...{fallbackContext}...
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onFindInDoc && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFindInDoc(citation.quoteText)}
                className="h-7 text-xs border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/20 gap-1"
              >
                <Search className="h-3 w-3" />
                Search text
              </Button>
            )}
            <button
              type="button"
              onClick={() => setHighlightFailed(false)}
              className="p-1 hover:text-[#ededed] transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main DOCX Document Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 scrollbar-thin"
        tabIndex={0}
      >
        <div className="relative max-w-4xl mx-auto bg-white text-zinc-900 rounded-sm shadow-2xl p-8 sm:p-12 min-h-[900px]">
          {/* Highlight Overlay Layer */}
          {highlightRects.length > 0 && (
            <HighlightOverlay
              rects={highlightRects}
              onDismiss={() => {
                setHighlightRects([]);
                onDismissCitation?.();
              }}
            />
          )}

          {/* Rendered DOCX DOM Content */}
          <div ref={containerRef} className="docx-render-container select-text leading-relaxed" />
        </div>
      </div>
    </div>
  );
}
