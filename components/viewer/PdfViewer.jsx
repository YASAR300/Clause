"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Search,
  X,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfPage } from "./PdfPage";
import {
  locateInDom,
  locateCrossPageInDom,
  getHighlightRects,
  scrollHighlightIntoView,
} from "@/lib/highlight";

/**
 * Virtualized PDF Viewer component using pdfjs-dist.
 * Renders pages lazily (visible +/- 1) with canvas + TextLayer.
 * Handles single-page, multi-line, cross-page, and duplicate citation highlights.
 */
export function PdfViewer({
  documentId,
  blobUrl,
  documentName = "Contract Document",
  citation = null,
  fullText = "",
  onFindInDoc,
  onDismissCitation,
}) {
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const textLayersMapRef = useRef(new Map());

  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Zoom management (50% to 200%)
  const [zoom, setZoom] = useState(1.0);

  // Visible pages tracking for virtualization
  const [visiblePages, setVisiblePages] = useState(new Set([1, 2]));

  // Citation highlight state
  const [highlightsByPage, setHighlightsByPage] = useState(new Map());
  const [highlightFailed, setHighlightFailed] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(1);

  // Track whether we're waiting for a text layer to apply a pending citation.
  // Incrementing highlightTrigger forces the highlight effect to re-run.
  const pendingCitationRef = useRef(false);
  const [highlightTrigger, setHighlightTrigger] = useState(0);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadPdf() {
      try {
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");

        if (typeof window !== "undefined") {
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        const fileUrl = blobUrl || (documentId ? `/api/documents/${documentId}/file` : null);
        if (!fileUrl) {
          throw new Error("No PDF source URL or document ID provided.");
        }

        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          isEvalSupported: false,
          useSystemFonts: true,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load PDF file from storage.");
        setLoading(false);
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [documentId, blobUrl]);

  // Set up IntersectionObserver for page virtualization
  useEffect(() => {
    if (!numPages || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const pageNum = parseInt(entry.target.getAttribute("data-page-number"), 10);
            if (entry.isIntersecting) {
              next.add(pageNum);
              // Preload +/- 1 page
              if (pageNum > 1) next.add(pageNum - 1);
              if (pageNum < numPages) next.add(pageNum + 1);
            }
          });
          return next;
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "600px 0px",
        threshold: 0.01,
      }
    );

    // Observe each page container
    for (let i = 1; i <= numPages; i++) {
      const el = document.getElementById(`page-container-${i}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [numPages, zoom]);

  // Text layer registration callback from child PdfPage
  const handleTextLayerReady = useCallback((pageNum, textLayerDiv) => {
    textLayersMapRef.current.set(pageNum, textLayerDiv);
    // If there's a pending citation waiting for any text layer, re-run the highlight
    if (pendingCitationRef.current) {
      pendingCitationRef.current = false;
      setHighlightTrigger((t) => t + 1);
    }
  }, []);

  // Compute and display citation highlights
  const applyCitationHighlight = useCallback(() => {
    if (!citation || !citation.quoteText) {
      setHighlightsByPage(new Map());
      setHighlightFailed(false);
      return;
    }

    const { pageStart, pageEnd, quoteText, startOffset } = citation;
    const isCrossPage = pageStart && pageEnd && pageStart !== pageEnd;

    // Ensure target pages are in visible set so they render immediately
    setVisiblePages((prev) => {
      const next = new Set(prev);
      for (let p = (pageStart || 1); p <= (pageEnd || pageStart || 1); p++) {
        next.add(p);
      }
      return next;
    });

    if (isCrossPage) {
      // Cross-page quote: include pageContainerEl so cross-page.js uses it as the
      // coordinate origin, matching the HighlightOverlay's absolute-position context.
      const pagesToLocate = [];
      for (let p = pageStart; p <= pageEnd; p++) {
        const container = textLayersMapRef.current.get(p);
        if (container) {
          const pageContainerEl = document.getElementById(`page-container-${p}`);
          pagesToLocate.push({ pageNumber: p, container, pageContainerEl });
        }
      }

      if (pagesToLocate.length < (pageEnd - pageStart + 1)) {
        // Wait until all cross-page layers finish rendering
        pendingCitationRef.current = true;
        setTimeout(applyCitationHighlight, 150);
        return;
      }

      const result = locateCrossPageInDom(pagesToLocate, quoteText);
      if (result.matchFound) {
        setHighlightsByPage(result.pageHighlights);
        setHighlightFailed(false);

        // Scroll to first page
        const firstPageEl = document.getElementById(`page-container-${result.firstPage}`);
        const rects = result.pageHighlights.get(result.firstPage);
        if (firstPageEl && rects?.length) {
          scrollHighlightIntoView(firstPageEl, rects, scrollContainerRef.current);
          // After scroll settles, recompute rects to correct any getBoundingClientRect drift
          setTimeout(() => {
            const freshResult = locateCrossPageInDom(pagesToLocate, quoteText);
            if (freshResult.matchFound) {
              setHighlightsByPage(freshResult.pageHighlights);
            }
          }, 350);
        }
      } else {
        setHighlightFailed(true);
      }
    } else {
      // Single-page quote
      const targetPage = pageStart || 1;
      const container = textLayersMapRef.current.get(targetPage);

      if (!container) {
        // Mark as pending and retry — the text layer ready callback will also
        // trigger a re-render once the layer is available.
        pendingCitationRef.current = true;
        setTimeout(applyCitationHighlight, 300);
        return;
      }

      const matches = locateInDom(container, quoteText, {
        findAll: true,
        hintOffset: startOffset,
      });

      if (matches.length > 0) {
        setTotalMatches(matches.length);
        const matchIdx = Math.min(activeMatchIndex, matches.length - 1);
        const activeMatch = matches[matchIdx];

        // Use the page container element as coordinate origin so that highlight
        // rects align with HighlightOverlay which is absolute-positioned inside it.
        const pageContainerEl = document.getElementById(`page-container-${targetPage}`);
        const coordOrigin = pageContainerEl || container;
        const rects = getHighlightRects(activeMatch.range, coordOrigin);
        const newMap = new Map();
        newMap.set(targetPage, rects);

        setHighlightsByPage(newMap);
        setHighlightFailed(false);

        // Scroll page into view first
        const pageEl = document.getElementById(`page-container-${targetPage}`);
        if (pageEl && rects.length > 0) {
          scrollHighlightIntoView(pageEl, rects, scrollContainerRef.current);
          // After the smooth scroll settles (~300ms), recompute rects so that
          // getBoundingClientRect returns final-position values.
          setTimeout(() => {
            const freshMatches = locateInDom(container, quoteText, {
              findAll: true,
              hintOffset: startOffset,
            });
            if (freshMatches.length > 0) {
              const freshMatch = freshMatches[Math.min(activeMatchIndex, freshMatches.length - 1)];
              const freshRects = getHighlightRects(freshMatch.range, coordOrigin);
              if (freshRects.length > 0) {
                const freshMap = new Map();
                freshMap.set(targetPage, freshRects);
                setHighlightsByPage(freshMap);
              }
            }
          }, 350);
        }
      } else {
        setHighlightFailed(true);
      }
    }
  }, [citation, activeMatchIndex]);

  // Trigger highlight calculation when citation, zoom, or highlightTrigger changes
  useEffect(() => {
    applyCitationHighlight();
  }, [citation, zoom, highlightTrigger, applyCitationHighlight]);

  // Keyboard dismiss (Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setHighlightsByPage(new Map());
        onDismissCitation?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismissCitation]);

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.0, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100));
  const handleFitWidth = () => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth - 48;
      const fitZoom = Math.max(0.6, Math.min(1.8, containerWidth / 800));
      setZoom(Math.round(fitZoom * 100) / 100);
    }
  };

  // Duplicate matches cycling
  const handleNextMatch = () => {
    if (totalMatches > 1) {
      setActiveMatchIndex((prev) => (prev + 1) % totalMatches);
    }
  };

  const handlePrevMatch = () => {
    if (totalMatches > 1) {
      setActiveMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
    }
  };

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
        <p className="text-xs text-[#ededed] font-medium">Opening PDF contract...</p>
        <p className="text-[11px] text-[#71717a] font-mono mt-1">Preparing virtualization & text layer</p>
      </div>
    );
  }

  if (error) {
    if (fullText) {
      return (
        <div className="flex h-full flex-col bg-[#0c0c0e] overflow-hidden">
          <div className="p-2.5 bg-[#f59e0b]/10 border-b border-[#f59e0b]/20 flex items-center justify-between text-xs text-[#f59e0b] px-4 shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              PDF preview unavailable — viewing extracted contract text
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 text-xs text-[#d4d4d8] leading-relaxed font-sans whitespace-pre-wrap select-text">
            {citation?.quoteText && fullText.includes(citation.quoteText) ? (
              <>
                <span>{fullText.slice(0, fullText.indexOf(citation.quoteText))}</span>
                <mark className="bg-[#3b82f6]/30 text-white border-b-2 border-[#3b82f6] px-1 py-0.5 rounded shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse">
                  {citation.quoteText}
                </mark>
                <span>{fullText.slice(fullText.indexOf(citation.quoteText) + citation.quoteText.length)}</span>
              </>
            ) : (
              <span>{fullText}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#09090b] space-y-3">
        <AlertCircle className="h-8 w-8 text-[#ef4444]" />
        <p className="text-xs text-[#ef4444] font-medium">{error}</p>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="text-xs">
          Reload viewer
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full bg-[#0c0c0e] relative overflow-hidden">
      {/* Viewer Secondary Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#222226] bg-[#121215]/90 backdrop-blur-md shrink-0 z-20 text-xs">
        {/* Page counter & title */}
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-[#3b82f6]" />
          <span className="font-mono text-[11px] text-[#a1a1aa]">
            {numPages} {numPages === 1 ? "page" : "pages"}
          </span>
          {citation && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#10b981] px-1.5 py-0.2 rounded bg-[#10b981]/10 border border-[#10b981]/20">
              Citation p. {citation.pageStart}
            </span>
          )}
        </div>

        {/* Duplicate match cycle toolbar */}
        {totalMatches > 1 && highlightsByPage.size > 0 && (
          <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] rounded-md px-2 py-0.5">
            <span className="font-mono text-[10px] text-[#ededed]">
              Match {activeMatchIndex + 1} of {totalMatches}
            </span>
            <div className="flex items-center">
              <button
                type="button"
                onClick={handlePrevMatch}
                className="p-0.5 hover:text-[#ededed] text-[#71717a] transition-colors"
                aria-label="Previous match"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMatch}
                className="p-0.5 hover:text-[#ededed] text-[#71717a] transition-colors"
                aria-label="Next match"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="p-1.5 rounded text-[#71717a] hover:text-[#ededed] hover:bg-[#18181b] disabled:opacity-30 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[11px] text-[#ededed] w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 2.0}
            className="p-1.5 rounded text-[#71717a] hover:text-[#ededed] hover:bg-[#18181b] disabled:opacity-30 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFitWidth}
            className="p-1.5 rounded text-[#71717a] hover:text-[#ededed] hover:bg-[#18181b] transition-colors ml-1"
            title="Fit to width"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Fallback Banner: Couldn't highlight on page */}
      {highlightFailed && citation && (
        <div className="p-3 bg-[#f59e0b]/10 border-b border-[#f59e0b]/30 text-xs text-[#f59e0b] flex items-start justify-between gap-3 shrink-0 z-20">
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-xs">
                Couldn&apos;t highlight this passage visually on Page {citation.pageStart}
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

      {/* Virtualized Page Scroll Stream */}
      <div
        ref={scrollContainerRef}
        className="pdfViewer flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin"
        style={{
          "--scale-factor": `${zoom}`,
        }}
        tabIndex={0}
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const isVisible = visiblePages.has(pageNum);
          const pageHighlights = highlightsByPage.get(pageNum) || [];

          return (
            <PdfPage
              key={pageNum}
              pageNumber={pageNum}
              pdfDoc={pdfDoc}
              zoom={zoom}
              isVisible={isVisible}
              highlights={pageHighlights}
              activeMatchIndex={activeMatchIndex}
              totalMatches={totalMatches}
              onTextLayerReady={handleTextLayerReady}
              onDismissHighlight={() => {
                setHighlightsByPage(new Map());
                onDismissCitation?.();
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
