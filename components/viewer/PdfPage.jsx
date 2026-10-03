"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { HighlightOverlay } from "./HighlightOverlay";

/**
 * Individual PDF Page renderer with canvas + pdf.js TextLayer,
 * lazy rendering, cancellation on unmount/scroll-away, and highlight overlay.
 */
export function PdfPage({
  pageNumber,
  pdfDoc,
  zoom = 1.0,
  isVisible = false,
  aspectRatio = 1.294,
  highlights = [],
  activeMatchIndex = 0,
  totalMatches = 1,
  onTextLayerReady,
  onDismissHighlight,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [pageWidth, setPageWidth] = useState(800);
  const [pageHeight, setPageHeight] = useState(800 * aspectRatio);

  useEffect(() => {
    if (!pdfDoc || !isVisible) {
      // Cancel active render task if page scrolls out of view
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Task already completed or cancelled
        }
        renderTaskRef.current = null;
      }
      return;
    }

    let isMounted = true;

    async function renderPage() {
      try {
        setIsRendering(true);
        const page = await pdfDoc.getPage(pageNumber);
        if (!isMounted) return;

        // Base viewport at 1.0 scale
        const baseViewport = page.getViewport({ scale: 1.0 });
        const viewport = page.getViewport({ scale: zoom });

        const scaledW = viewport.width;
        const scaledH = viewport.height;
        setPageWidth(scaledW);
        setPageHeight(scaledH);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: false });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(scaledW * dpr);
        canvas.height = Math.floor(scaledH * dpr);
        canvas.style.width = `${scaledW}px`;
        canvas.style.height = `${scaledH}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Cancel previous task if running
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // Ignored
          }
        }

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!isMounted) return;

        // Render TextLayer for selection and citation measurement
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
          textLayerDiv.innerHTML = "";
          textLayerDiv.style.width = `${scaledW}px`;
          textLayerDiv.style.height = `${scaledH}px`;
          textLayerDiv.style.setProperty("--scale-factor", `${zoom}`);
          textLayerDiv.style.setProperty("--user-unit", "1");
          textLayerDiv.style.setProperty("--total-scale-factor", `${zoom}`);
          textLayerDiv.style.setProperty("--scale-round-x", "1px");
          textLayerDiv.style.setProperty("--scale-round-y", "1px");

          const textContent = await page.getTextContent();
          if (!isMounted) return;

          const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
          if (pdfjs.TextLayer) {
            const textLayer = new pdfjs.TextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport,
            });
            await textLayer.render();
          }

          if (isMounted) {
            setRendered(true);
            setIsRendering(false);
            onTextLayerReady?.(pageNumber, textLayerDiv);
          }
        }
      } catch (err) {
        if (err?.name !== "RenderingCancelledException" && isMounted) {
          console.warn(`Page ${pageNumber} render failed:`, err?.message);
          setIsRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignored
        }
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNumber, zoom, isVisible]);

  return (
    <div
      ref={containerRef}
      id={`page-container-${pageNumber}`}
      data-page-number={pageNumber}
      style={{
        width: `${pageWidth}px`,
        minHeight: `${pageHeight}px`,
        "--scale-factor": `${zoom}`,
        "--user-unit": "1",
        "--total-scale-factor": `${zoom}`,
        "--scale-round-x": "1px",
        "--scale-round-y": "1px",
      }}
      className="page relative mx-auto my-4 bg-white shadow-2xl rounded-sm select-text overflow-hidden"
    >
      {/* Canvas Layer */}
      <canvas ref={canvasRef} className="block w-full h-auto" />

      {/* Selectable TextLayer */}
      <div
        ref={textLayerRef}
        className="textLayer absolute inset-0 select-text pointer-events-auto"
        style={{
          "--scale-factor": `${zoom}`,
          "--user-unit": "1",
          "--total-scale-factor": `${zoom}`,
          "--scale-round-x": "1px",
          "--scale-round-y": "1px",
          lineHeight: "1",
        }}
      />

      {/* Citation Highlight Overlay */}
      {highlights?.length > 0 && (
        <HighlightOverlay
          rects={highlights}
          matchIndex={activeMatchIndex}
          totalMatches={totalMatches}
          onDismiss={onDismissHighlight}
        />
      )}

      {/* Placeholder or Rendering Spinner */}
      {(!rendered || isRendering) && (
        <div className="absolute inset-0 bg-[#18181b]/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121214]/80 border border-[#27272a] text-xs font-mono text-[#a1a1aa] shadow-md">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3b82f6]" />
            <span>Page {pageNumber}</span>
          </div>
        </div>
      )}

      {/* Page Number Watermark */}
      <div className="absolute bottom-2 right-3 font-mono text-[10px] text-zinc-400 bg-white/80 px-1.5 py-0.5 rounded pointer-events-none select-none">
        {pageNumber}
      </div>
    </div>
  );
}
